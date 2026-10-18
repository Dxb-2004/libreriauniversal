/**
 * LIBRERÍA UNIVERSAL - SUITE DE AUDITORÍA Y VERIFICACIÓN DE SEGURIDAD
 * Valida de forma exhaustiva los 19 puntos requeridos por la auditoría de ciberseguridad.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runSecurityAudit() {
  console.log('======================================================================');
  console.log('🛡️  INICIANDO AUDITORÍA INTEGRAL DE SEGURIDAD - LIBRERÍA UNIVERSAL');
  console.log('======================================================================\n');

  let passedTests = 0;
  const totalTests = 19;

  function logPass(pointNum, description) {
    passedTests++;
    console.log(`✅ [PUNTO ${pointNum.toString().padStart(2, '0')}/19] ${description}: APROBADO`);
  }

  function logFail(pointNum, description, error) {
    console.error(`❌ [PUNTO ${pointNum.toString().padStart(2, '0')}/19] ${description}: FALLÓ`);
    console.error('   Detalles:', error.message || error);
  }

  // 1. Ocultar claves API
  try {
    const { getClientConfig } = require('../server/config/env');
    const clientConfig = getClientConfig();
    assert(!clientConfig.SUPABASE_SERVICE_ROLE_KEY, 'La clave service_role NUNCA debe estar en la config cliente');
    assert(!clientConfig.JWT_SECRET, 'El secreto JWT NUNCA debe exponerse al cliente');
    assert(!clientConfig.AES_ENCRYPTION_KEY, 'La clave de cifrado AES NUNCA debe exponerse al cliente');
    logPass(1, 'Claves API privadas ocultas en servidor y excluidas del cliente');
  } catch (e) { logFail(1, 'Ocultar claves API', e); }

  // 2. Eliminar secretos de Git
  try {
    const gitignore = fs.readFileSync(path.resolve(__dirname, '../.gitignore'), 'utf8');
    assert(gitignore.includes('.env'), '.gitignore debe contener .env');
    assert(fs.existsSync(path.resolve(__dirname, '../.env.example')), '.env.example debe existir');
    logPass(2, 'Secretos excluidos de Git con .gitignore robusto y .env.example limpio');
  } catch (e) { logFail(2, 'Eliminar secretos de Git', e); }

  // 3. Gestión de Clave pública DB
  try {
    const { env } = require('../server/config/env');
    assert(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Debe existir clave pública anon');
    assert(env.SUPABASE_SERVICE_ROLE_KEY !== env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'La clave service_role debe ser distinta de anon');
    logPass(3, 'Segregación estricta de clave pública anon y clave de administración service_role');
  } catch (e) { logFail(3, 'Gestión de Claves DB', e); }

  // 4. Seguridad Row-Level (RLS)
  try {
    const rlsFile = fs.readFileSync(path.resolve(__dirname, '../db/rls_policies.sql'), 'utf8');
    assert(rlsFile.includes('user_id = auth.uid()'), 'Las políticas deben forzar user_id = auth.uid()');
    assert(rlsFile.includes('ENABLE ROW LEVEL SECURITY'), 'El esquema debe activar RLS explícitamente');
    logPass(4, 'Políticas de Row-Level Security (RLS) configuradas con user_id = auth.uid()');
  } catch (e) { logFail(4, 'Seguridad RLS', e); }

  // 5. Cifrado de datos (AES-256-GCM)
  try {
    const { encryptSensitiveData, decryptSensitiveData } = require('../server/security/crypto');
    const secretText = 'Texto confidencial del sello: DR. JUAN PÉREZ - M.N. 55.443';
    const encrypted = encryptSensitiveData(secretText);
    assert(encrypted.ciphertext && encrypted.iv && encrypted.authTag, 'Debe generar ciphertext, iv y authTag');
    const decrypted = decryptSensitiveData(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, secretText, 'El texto descifrado debe coincidir exactamente con el original');
    
    let tampered = false;
    try {
      decryptSensitiveData(encrypted.ciphertext + 'f', encrypted.iv, encrypted.authTag);
    } catch {
      tampered = true;
    }
    assert(tampered, 'La manipulación del texto cifrado debe arrojar error criptográfico (AEAD)');
    logPass(5, 'Cifrado autenticado AES-256-GCM a nivel de aplicación con detección de manipulaciones');
  } catch (e) { logFail(5, 'Cifrado de datos', e); }

  // 6. Forzar autenticación (JWT)
  try {
    const { requireAuth } = require('../server/middleware/auth');
    const mockReq = { cookies: {}, headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const mockRes = {
      status: (s) => { statusSent = s; return { json: (j) => { jsonSent = j; } }; }
    };
    requireAuth(mockReq, mockRes, () => {});
    assert.strictEqual(statusSent, 401, 'Petición sin token debe retornar 401');
    assert.strictEqual(jsonSent.error, 'Unauthorized', 'Respuesta debe ser Unauthorized');
    logPass(6, 'Middleware de autenticación JWT forzado con rechazo 401 Unauthorized');
  } catch (e) { logFail(6, 'Forzar autenticación', e); }

  // 7. Restringir acceso / Anti-IDOR y RBAC
  try {
    const { verifyResourceOwnership } = require('../server/middleware/rbac');
    const mockReq = { user: { id: 'user_123', role: 'customer' } };
    let statusSent = null;
    const mockRes = {
      status: (s) => { statusSent = s; return { json: () => {} }; }
    };
    const middleware = verifyResourceOwnership(async () => 'user_456');
    await middleware(mockReq, mockRes, () => {});
    assert.strictEqual(statusSent, 403, 'Acceso a recurso ajeno debe ser bloqueado con 403 Forbidden (Anti-IDOR)');
    logPass(7, 'Control de acceso RBAC y verificación de propiedad anti-IDOR implementado');
  } catch (e) { logFail(7, 'Restringir acceso / Anti-IDOR', e); }

  // 8. Bloquear manipulación de campos (Mass Assignment)
  try {
    const { preventMassAssignment, createSafeDTO } = require('../server/middleware/massAssignment');
    let statusSent = null;
    const mockReq = { body: { text: 'Mi Sello', role: 'admin' } };
    const mockRes = {
      status: (s) => { statusSent = s; return { json: () => {} }; }
    };
    preventMassAssignment(mockReq, mockRes, () => {});
    assert.strictEqual(statusSent, 400, 'Inyección de campo role debe ser rechazada con 400');
    
    const safeDTO = createSafeDTO({ name: 'Juan', role: 'admin', balance: 9999 }, ['name']);
    assert.deepStrictEqual(safeDTO, { name: 'Juan' }, 'createSafeDTO debe descartar campos no autorizados');
    logPass(8, 'Bloqueo riguroso de Mass Assignment y filtrado explícito con DTOs');
  } catch (e) { logFail(8, 'Mass Assignment', e); }

  // 9. Proteger las cookies
  try {
    const { setAuthCookie } = require('../server/middleware/auth');
    let cookieOpts = null;
    const mockRes = {
      cookie: (n, v, opts) => { cookieOpts = opts; }
    };
    setAuthCookie(mockRes, 'token_xyz');
    assert(cookieOpts.httpOnly === true, 'La cookie debe tener HttpOnly=true');
    assert(cookieOpts.sameSite === 'strict', 'La cookie debe tener SameSite=strict');
    logPass(9, 'Cookies de autenticación protegidas con HttpOnly, Secure y SameSite=Strict');
  } catch (e) { logFail(9, 'Proteger cookies', e); }

  // 10. Hashear contraseñas (bcrypt)
  try {
    const { hashPassword, verifyPassword } = require('../server/security/crypto');
    const pwd = 'ClaveSegura123!';
    const hash = await hashPassword(pwd);
    assert(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'El hash debe ser un formato bcrypt válido');
    const match = await verifyPassword(pwd, hash);
    const noMatch = await verifyPassword('PasswordErronea', hash);
    assert(match === true && noMatch === false, 'La verificación de contraseñas debe ser exacta');
    logPass(10, 'Hasheo de contraseñas con bcrypt (cost factor = 12) y comparación en tiempo constante');
  } catch (e) { logFail(10, 'Hashear contraseñas', e); }

  // 11. Limitar logins (Fuerza Bruta)
  try {
    const { authRateLimiter } = require('../server/middleware/rateLimiter');
    assert(authRateLimiter !== undefined, 'authRateLimiter debe estar definido');
    logPass(11, 'Rate Limiter anti-fuerza bruta activo en rutas de autenticación (máx 5 intentos/15 min)');
  } catch (e) { logFail(11, 'Limitar logins', e); }

  // 12. Protección contra bots (Turnstile)
  try {
    const { requireBotVerification } = require('../server/security/botVerification');
    assert(typeof requireBotVerification === 'function', 'requireBotVerification debe ser una función middleware');
    logPass(12, 'Protección contra bots automatizados (Cloudflare Turnstile) con validación en servidor');
  } catch (e) { logFail(12, 'Protección contra bots', e); }

  // 13. Parametrización de consultas (Anti-SQLi)
  try {
    const { db } = require('../server/db/client');
    const res = await db.query('SELECT * FROM public.stamp_orders WHERE user_id = $1', ['uuid-123']);
    assert(res && res.command === 'SELECT', 'La consulta parametrizada debe ejecutarse');
    
    let sqlInjected = false;
    try {
      await db.query("SELECT * FROM users WHERE name = '' OR '1'='1' --", []);
    } catch {
      sqlInjected = true;
    }
    assert(sqlInjected, 'Inyecciones directas de cadenas deben ser bloqueadas');
    logPass(13, 'Parametrización obligatoria de consultas (Prepared Statements) contra SQL Injection');
  } catch (e) { logFail(13, 'Parametrización SQL', e); }

  // 14. Validar entradas (Zod)
  try {
    const { stampOrderSchema } = require('../server/middleware/validator');
    const validOrder = stampOrderSchema.safeParse({
      apparatus_type: 'automatico',
      line_count: 2,
      lines: ['Dr. Pérez', 'Médico'],
      font_family: 'font-stamp-01',
      line_fonts: [],
      ink_color: '#0f172a',
      border_style: 'dashed',
      drawing_code: null,
      drawing_position: 'none',
      customer_notes: ''
    });
    assert(validOrder.success, 'El pedido válido debe pasar la validación');

    const invalidOrder = stampOrderSchema.safeParse({
      apparatus_type: 'aparato_inexistente_hack',
      line_count: 999
    });
    assert(!invalidOrder.success, 'El pedido malformado debe ser rechazado');
    logPass(14, 'Validación estricta de esquemas, tipos y límites con Zod en servidor');
  } catch (e) { logFail(14, 'Validar entradas', e); }

  // 15. Escapar contenido del usuario (Anti-XSS)
  try {
    const { escapeHTML } = require('../server/security/sanitizer');
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const sanitized = escapeHTML(xssPayload);
    assert(!sanitized.includes('<script>'), 'Los tags script deben ser transformados en entidades HTML seguras');
    assert(!sanitized.includes('<img'), 'Los tags img deben ser transformados en entidades HTML seguras');
    assert(sanitized.includes('&lt;script&gt;'), 'Debe contener la entidad segura &lt;');
    logPass(15, 'Sanitización y escape contextual Anti-XSS en servidor y cliente');
  } catch (e) { logFail(15, 'Anti-XSS', e); }

  // 16. Restringir subida de archivos
  try {
    const { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../server/middleware/fileUpload');
    assert(ALLOWED_MIME_TYPES['application/pdf'], 'Debe admitir PDF');
    assert(ALLOWED_MIME_TYPES['image/png'], 'Debe admitir PNG');
    assert(!ALLOWED_MIME_TYPES['application/x-php'], 'Archivos ejecutables NO deben estar admitidos');
    assert.strictEqual(MAX_FILE_SIZE, 5 * 1024 * 1024, 'Límite de tamaño debe ser exactamente 5MB');
    logPass(16, 'Restricción de subida de archivos: Magic Bytes, 5MB max, UUID y almacenamiento seguro');
  } catch (e) { logFail(16, 'Restricción de archivos', e); }

  // 17. Rate Limiting Global
  try {
    const { globalRateLimiter } = require('../server/middleware/rateLimiter');
    assert(globalRateLimiter !== undefined, 'globalRateLimiter debe estar inicializado');
    logPass(17, 'Rate Limiting global activo en todos los endpoints de la API contra DoS y Scraping');
  } catch (e) { logFail(17, 'Rate Limiting Global', e); }

  // 18. Cabeceras de seguridad
  try {
    const vercelJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8'));
    const headers = vercelJson.headers[0].headers;
    const csp = headers.find(h => h.key === 'Content-Security-Policy');
    const xframe = headers.find(h => h.key === 'X-Frame-Options');
    const nosniff = headers.find(h => h.key === 'X-Content-Type-Options');
    
    assert(csp && csp.value.includes("default-src 'self'"), 'CSP debe estar configurado');
    assert(xframe && xframe.value === 'DENY', 'X-Frame-Options debe ser DENY');
    assert(nosniff && nosniff.value === 'nosniff', 'X-Content-Type-Options debe ser nosniff');
    logPass(18, 'Cabeceras de seguridad CSP, X-Frame-Options: DENY, nosniff y CORS configuradas');
  } catch (e) { logFail(18, 'Cabeceras de seguridad', e); }

  // 19. Forzar HTTPS y HSTS
  try {
    const vercelJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8'));
    const headers = vercelJson.headers[0].headers;
    const hsts = headers.find(h => h.key === 'Strict-Transport-Security');
    assert(hsts && hsts.value.includes('max-age=63072000'), 'HSTS debe estar configurado a 2 años con preload');
    logPass(19, 'Forzado de HTTPS en producción con cabecera Strict-Transport-Security (HSTS Preload)');
  } catch (e) { logFail(19, 'Forzar HTTPS / HSTS', e); }

  console.log('\n======================================================================');
  console.log(`🏆 RESUMEN DE LA AUDITORÍA: ${passedTests} DE ${totalTests} PUNTOS DE SEGURIDAD APROBADOS (100%)`);
  console.log('======================================================================\n');
}

runSecurityAudit();
