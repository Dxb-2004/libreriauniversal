/**
 * LIBRERÍA UNIVERSAL - CABECERAS DE SEGURIDAD Y FORZADO HTTPS
 * Punto 18: Content-Security-Policy (CSP), X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, CORS estricto.
 * Punto 19: Forzar HTTPS y activación de Strict-Transport-Security (HSTS).
 */

const helmet = require('helmet');
const cors = require('cors');
const { env } = require('../config/env');

// Orígenes permitidos estrictos
const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());

/**
 * Middleware de CORS Estricto
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como aplicaciones móviles nativas o Postman) en desarrollo
    if (!origin && env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Acceso bloqueado por política de CORS para el origen: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Bot-Token', 'X-CSRF-Token'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  maxAge: 86400 // Cache de preflight por 24 horas
});

/**
 * Middleware Helmet con Content-Security-Policy optimizado para Librería Universal
 */
const helmetSecurityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://fonts.cdnfonts.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://fonts.cdnfonts.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://*.supabase.co"
      ],
      frameSrc: [
        "'self'",
        "https://www.google.com",
        "https://maps.google.com"
      ],
        "https://challenges.cloudflare.com"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://wa.me"],
      frameAncestors: ["'none'"], // Protección anti-clickjacking adicional
      upgradeInsecureRequests: [] // Punto 19: Forzar actualización a HTTPS de todos los recursos
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  xFrameOptions: { action: 'deny' }, // Punto 18: X-Frame-Options: DENY
  xContentTypeOptions: true, // Punto 18: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Punto 18
  hsts: {
    maxAge: 63072000, // 2 años en segundos (Punto 19)
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Middleware para forzar redirección HTTP a HTTPS en servidores tradicionales (Punto 19)
 */
function enforceHttpsMiddleware(req, res, next) {
  const isLocalhost = req.headers.host && (req.headers.host.includes('localhost') || req.headers.host.includes('127.0.0.1'));
  if (env.NODE_ENV === 'production' && !isLocalhost && req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
}

/**
 * Encabezados de permisos restrictivos (Permissions-Policy)
 */
function permissionsPolicyMiddleware(req, res, next) {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=(), interest-cohort=()'
  );
  next();
}

module.exports = {
  corsMiddleware,
  helmetSecurityHeaders,
  enforceHttpsMiddleware,
  permissionsPolicyMiddleware
};
