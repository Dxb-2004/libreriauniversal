/**
 * LIBRERÍA UNIVERSAL - SANITIZACIÓN Y ESCAPE ANTI-XSS
 * Punto 15: Sanitizar y escapar todo el contenido generado por usuarios antes de almacenar o renderizar.
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

const HTML_ESCAPE_REGEX = /[&<>"'`/=\\]/g;

/**
 * Escapa caracteres HTML especiales para prevenir Cross-Site Scripting (XSS).
 * @param {string} str - Cadena de entrada
 * @returns {string} - Cadena con entidades HTML escapadas
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(HTML_ESCAPE_REGEX, char => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Sanitiza recursivamente objetos y arreglos para limpiar cadenas de entrada.
 * @param {any} val 
 * @returns {any}
 */
function sanitizeDeep(val) {
  if (typeof val === 'string') {
    return escapeHTML(val.trim());
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeDeep(item));
  }
  if (val !== null && typeof val === 'object') {
    const cleanObj = {};
    for (const key of Object.keys(val)) {
      cleanObj[key] = sanitizeDeep(val[key]);
    }
    return cleanObj;
  }
  return val;
}

/**
 * Middleware que sanitiza preventivamente el body y query de peticiones contra XSS.
 */
function xssSanitizerMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.sanitizedBody = sanitizeDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.sanitizedQuery = sanitizeDeep(req.query);
  }
  next();
}

module.exports = {
  escapeHTML,
  sanitizeDeep,
  xssSanitizerMiddleware
};
