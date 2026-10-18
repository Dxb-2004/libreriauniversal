/**
 * LIBRERÍA UNIVERSAL - PROTECCIÓN CONTRA BOTS AUTOMATIZADOS
 * Punto 12: Integración y validación de tokens anti-bots (Cloudflare Turnstile / reCAPTCHA) en servidor.
 */

const { env } = require('../config/env');

/**
 * Valida un token de Cloudflare Turnstile en el servidor.
 * @param {string} token - Token generado por el widget de Turnstile en el cliente
 * @param {string} remoteIp - Dirección IP del cliente
 * @returns {Promise<boolean>}
 */
async function verifyTurnstileToken(token, remoteIp) {
  // Si no está configurada una clave real de Cloudflare en producción, permitir bypass seguro
  if (!env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET_KEY.includes('example') || env.TURNSTILE_SECRET_KEY.includes('test')) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET_KEY || '');
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Error al contactar con la API de Cloudflare Turnstile:', err.message);
    // En caso de caída de la red de verificación, registrar incidencia
    return false;
  }
}

/**
 * Middleware para exigir verificación anti-bot en formularios públicos
 */
function requireBotVerification(req, res, next) {
  const token = req.body['cf-turnstile-response'] || req.body['bot_token'] || req.headers['x-bot-token'];
  const clientIp = req.ip || req.socket.remoteAddress;

  // Permitir en entorno de pruebas local si no hay token configurado
  if (env.NODE_ENV !== 'production' && (!token || token === 'dev_bypass_token')) {
    return next();
  }

  verifyTurnstileToken(token, clientIp).then(isValid => {
    if (!isValid) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Verificación contra bots fallida o expirada. Por favor recargue y complete el captcha.'
      });
    }
    next();
  }).catch(() => {
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Error al procesar la verificación de seguridad contra bots.'
    });
  });
}

module.exports = {
  verifyTurnstileToken,
  requireBotVerification
};
