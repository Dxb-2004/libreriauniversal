/**
 * LIBRERÍA UNIVERSAL - GESTIÓN SEGURA DE CREDENCIALES ADMINISTRATIVAS
 * Implementa cifrado AES-256-GCM para códigos de seguridad y hashing bcrypt (costo 12)
 * para contraseñas de administrador con persistencia resiliente en entornos serverless y locales.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyPassword, encryptSensitiveData, decryptSensitiveData } = require('./crypto');
const { env } = require('../config/env');

const PRIMARY_AUTH_FILE = path.resolve(__dirname, '../data/auth_config.json');
const SERVERLESS_AUTH_FILE = '/tmp/auth_config.json';

// Credenciales iniciales por defecto (hasheadas y cifradas)
const DEFAULT_AUTH_DATA = {
  admin_email: env.ADMIN_EMAIL || 'libu.impresiones@gmail.com',
  // Hash bcrypt generado para 'UniversalAlsina2026!'
  password_hash: '$2a$12$Uug4YARAVT1WPDXiZjyJCuIyGsm17/uacb7lYuIht.gL02GhqYJc.',
  // Código maestro de recuperación cifrado con AES-256-GCM ('LU-ADMIN-9481-SEC')
  recovery_code_encrypted: {
    ciphertext: 'db59106ff8cf059beae06532e1b4cf7073',
    iv: 'deb07b3ce1fea2c2430da794',
    authTag: 'c9351582ce1277a4f1341eb76494fcd6'
  },
  session_seed: crypto.randomBytes(32).toString('hex'),
  sessions_revoked_at: Math.floor(Date.now() / 1000),
  token_version: 1,
  encryption_standard: 'AES-256-GCM + Bcrypt-Cost-12',
  updated_at: new Date().toISOString()
};

let inMemoryAuthConfig = null;

/**
 * Obtiene la ruta de archivo disponible según el entorno
 */
function getActiveAuthFilePath() {
  if (process.env.VERCEL) {
    return SERVERLESS_AUTH_FILE;
  }
  return PRIMARY_AUTH_FILE;
}

/**
 * Carga la configuración de autenticación administrativa
 */
function getAuthConfig() {
  if (inMemoryAuthConfig !== null) {
    return inMemoryAuthConfig;
  }

  // 1. Intentar cargar desde el archivo del entorno actual
  const targetPath = getActiveAuthFilePath();
  try {
    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf8');
      inMemoryAuthConfig = JSON.parse(content);
      return inMemoryAuthConfig;
    }
  } catch (err) {
    // Si falla, probar con la ruta primaria
  }

  // 2. Intentar cargar desde la ruta primaria
  try {
    if (fs.existsSync(PRIMARY_AUTH_FILE)) {
      const content = fs.readFileSync(PRIMARY_AUTH_FILE, 'utf8');
      inMemoryAuthConfig = JSON.parse(content);
      return inMemoryAuthConfig;
    }
  } catch (err) {
    // Fallback a defaults en memoria
  }

  // 3. Fallback inicial seguro
  inMemoryAuthConfig = { ...DEFAULT_AUTH_DATA };
  saveAuthConfig(inMemoryAuthConfig);
  return inMemoryAuthConfig;
}

/**
 * Guarda la configuración de autenticación de forma segura
 */
function saveAuthConfig(config) {
  inMemoryAuthConfig = {
    ...config,
    updated_at: new Date().toISOString()
  };

  const jsonContent = JSON.stringify(inMemoryAuthConfig, null, 2);

  // Guardar en ruta primaria si es posible
  try {
    const primaryDir = path.dirname(PRIMARY_AUTH_FILE);
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_AUTH_FILE, jsonContent, 'utf8');
  } catch (err) {
    // En filesystem de solo lectura (Vercel Lambda), continuar con /tmp
  }

  // Guardar en /tmp para persistencia entre invocaciones calientes en serverless
  try {
    fs.writeFileSync(SERVERLESS_AUTH_FILE, jsonContent, 'utf8');
  } catch (err) {
    // Ignorar si no se puede escribir
  }
}

/**
 * Valida la contraseña del Administrador contra el hash bcrypt almacenado
 * @param {string} plainPassword 
 * @returns {Promise<boolean>}
 */
async function verifyAdminPassword(plainPassword) {
  if (!plainPassword) return false;
  const config = getAuthConfig();
  return await verifyPassword(plainPassword, config.password_hash);
}

/**
 * Actualiza la contraseña del Administrador con nuevo hash bcrypt
 * @param {string} newPassword 
 * @returns {Promise<boolean>}
 */
async function updateAdminPassword(newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  // Validar requisitos de seguridad
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  if (!hasUpper || !hasNumber) {
    throw new Error('La contraseña debe incluir al menos una letra mayúscula y un número.');
  }

  const newHash = await hashPassword(newPassword);
  const currentConfig = getAuthConfig();

  currentConfig.password_hash = newHash;
  saveAuthConfig(currentConfig);

  return true;
}

/**
 * Restablece la contraseña utilizando el código maestro de recuperación cifrado
 * @param {string} recoveryCode 
 * @param {string} newPassword 
 * @returns {Promise<boolean>}
 */
async function resetAdminPasswordWithCode(recoveryCode, newPassword) {
  if (!recoveryCode) {
    throw new Error('El código de recuperación es requerido.');
  }

  const config = getAuthConfig();
  if (!config.recovery_code_encrypted) {
    throw new Error('No hay código de recuperación configurado.');
  }

  const { ciphertext, iv, authTag } = config.recovery_code_encrypted;
  let decryptedMasterCode = '';

  try {
    decryptedMasterCode = decryptSensitiveData(ciphertext, iv, authTag);
  } catch (err) {
    throw new Error('Error criptográfico al validar el código de seguridad.');
  }

  const normalizedInput = recoveryCode.trim().toUpperCase();
  const normalizedMaster = decryptedMasterCode.trim().toUpperCase();

  if (normalizedInput !== normalizedMaster) {
    throw new Error('Código de recuperación inválido.');
  }

  return await updateAdminPassword(newPassword);
}

/**
 * Retorna el correo electrónico oficial del administrador
 */
function getAdminEmail() {
  const config = getAuthConfig();
  return config.admin_email || env.ADMIN_EMAIL || 'libu.impresiones@gmail.com';
}

/**
 * Retorna la clave secreta activa para firma y verificación de JWT,
 * derivada con la semilla de sesión dinámica para permitir invalidación instantánea.
 * @returns {string}
 */
function getActiveJwtSecret() {
  const config = getAuthConfig();
  const seed = config.session_seed || 'default_lu_session_seed_2026';
  return `${env.JWT_SECRET}_${seed}`;
}

/**
 * Revoca y desloguea TODAS las sesiones activas en todos los dispositivos
 * rotando la semilla criptográfica de JWT e incrementando la versión de tokens.
 * @returns {{ revoked_at: number, token_version: number }}
 */
function revokeAllSessions() {
  const config = getAuthConfig();
  config.session_seed = crypto.randomBytes(32).toString('hex');
  config.sessions_revoked_at = Math.floor(Date.now() / 1000);
  config.token_version = (config.token_version || 1) + 1;
  saveAuthConfig(config);
  return {
    revoked_at: config.sessions_revoked_at,
    token_version: config.token_version
  };
}

module.exports = {
  getAuthConfig,
  saveAuthConfig,
  verifyAdminPassword,
  updateAdminPassword,
  resetAdminPasswordWithCode,
  getAdminEmail,
  getActiveJwtSecret,
  revokeAllSessions
};
