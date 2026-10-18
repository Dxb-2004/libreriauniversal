/**
 * LIBRERÍA UNIVERSAL - MÓDULO CRIPTOGRÁFICO DE SEGURIDAD
 * Punto 5: Cifrado de datos AES-256-GCM con IV aleatorio y Tag de autenticación (AEAD)
 * Punto 10: Hasheo robusto de contraseñas con bcrypt (cost factor = 12)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { env } = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const BCRYPT_SALT_ROUNDS = 12;

// Derivar clave de 32 bytes garantizada desde la variable de entorno
const encryptionKey = Buffer.from(env.AES_ENCRYPTION_KEY, 'hex');
if (encryptionKey.length !== 32) {
  throw new Error('La clave AES_ENCRYPTION_KEY debe ser exactamente de 32 bytes (64 caracteres hex).');
}

/**
 * Cifra datos sensibles (PII, teléfonos, direcciones, diseños privados)
 * utilizando AES-256-GCM (Authenticated Encryption).
 * @param {string|object} data - Datos a cifrar
 * @returns {{ ciphertext: string, iv: string, authTag: string }}
 */
function encryptSensitiveData(data) {
  const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Descifra datos previamente cifrados con AES-256-GCM y valida su autenticidad.
 * Si los datos fueron manipulados, arrojará un error criptográfico.
 * @param {string} ciphertext - Texto cifrado en hex
 * @param {string} iv - Vector de inicialización en hex
 * @param {string} authTag - Tag de autenticación en hex
 * @returns {string} - Texto descifrado en claro
 */
function decryptSensitiveData(ciphertext, iv, authTag) {
  if (!ciphertext || !iv || !authTag) {
    throw new Error('Parámetros de descifrado incompletos.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Hashea contraseñas con bcrypt y salt aleatorio de alto costo.
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} - Hash seguro
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compara una contraseña en texto plano contra un hash bcrypt en tiempo constante.
 * @param {string} password - Contraseña enviada
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

/**
 * Genera un hash pseudoanónimo para IPs o identificadores para registro y rate limiting.
 * @param {string} val 
 * @returns {string}
 */
function hashIdentifier(val) {
  return crypto.createHmac('sha256', env.COOKIE_SECRET).update(String(val)).digest('hex');
}

module.exports = {
  encryptSensitiveData,
  decryptSensitiveData,
  hashPassword,
  verifyPassword,
  hashIdentifier
};
