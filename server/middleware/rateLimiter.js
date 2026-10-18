/**
 * LIBRERÍA UNIVERSAL - RATE LIMITING & PREVENCIÓN DE FUERZA BRUTA
 * Punto 11: Rate limiter estricto contra fuerza bruta en logins y registros (máx 5 intentos/15 min).
 * Punto 17: Rate limiter global para mitigar DoS, scraping y abusos de la API.
 */

const rateLimit = require('express-rate-limit');

/**
 * Punto 17: Rate Limiter Global para todos los endpoints de la API
 * 100 peticiones por ventana de 15 minutos por IP
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de peticiones por IP
  standardHeaders: true, // Retorna encabezados `RateLimit-*` estándar
  legacyHeaders: false, // Deshabilita encabezados `X-RateLimit-*` obsoletos
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Demasiadas peticiones desde su dirección IP. Por favor intente más tarde.',
      retryAfterSeconds: Math.ceil(15 * 60)
    });
  }
});

/**
 * Punto 11: Rate Limiter Estricto contra Fuerza Bruta para Autenticación
 * Máximo 5 intentos por ventana de 15 minutos por IP
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos fallidos
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skipSuccessfulRequests: true, // Si el login es exitoso, no penaliza el conteo
  handler: (req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Demasiados intentos de acceso fallidos. Por seguridad, su IP ha sido bloqueada temporalmente por 15 minutos.',
      retryAfterSeconds: Math.ceil(15 * 60)
    });
  }
});

/**
 * Rate limiter para formularios públicos (contacto y cotizaciones)
 * Máximo 10 envíos por hora por IP
 */
const contactFormRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Límite de mensajes alcanzado. Para consultas inmediatas, comuníquese directamente por WhatsApp a Librería Universal.'
    });
  }
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  contactFormRateLimiter
};
