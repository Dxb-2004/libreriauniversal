/**
 * LIBRERÍA UNIVERSAL - MIDDLEWARE DE AUTENTICACIÓN Y GESTIÓN DE COOKIES
 * Punto 6: Forzar autenticación en rutas privadas con JWT y respuesta 401 Unauthorized.
 * Punto 9: Configuración estricta de cookies con HttpOnly, Secure y SameSite=Strict.
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { getActiveJwtSecret, getAuthConfig } = require('../security/authManager');

const COOKIE_NAME = 'lu_access_token';

/**
 * Opciones seguras para cookies de sesión / autenticación (Punto 9)
 */
const SECURE_COOKIE_OPTIONS = {
  httpOnly: true, // Inaccesible desde JavaScript del navegador (Anti-XSS token theft)
  secure: env.NODE_ENV === 'production', // Solo se transmite sobre HTTPS en producción
  sameSite: 'strict', // Mitiga ataques de Cross-Site Request Forgery (CSRF)
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
};

/**
 * Genera un token JWT firmado de forma segura con la clave activa y versión de sesión.
 * @param {object} payload - Información del usuario (id, email, role)
 * @returns {string} - Token firmado
 */
function generateToken(payload) {
  const config = getAuthConfig();
  return jwt.sign(
    {
      sub: payload.id,
      id: payload.id,
      email: payload.email,
      role: payload.role || 'customer',
      token_version: config.token_version || 1
    },
    getActiveJwtSecret(),
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: 'libreria-universal',
      audience: 'libreria-universal-client'
    }
  );
}

/**
 * Inyecta la cookie de autenticación con todos los atributos de blindaje.
 * @param {import('express').Response} res 
 * @param {string} token 
 */
function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, SECURE_COOKIE_OPTIONS);
}

/**
 * Elimina la cookie de autenticación de forma segura al cerrar sesión.
 * @param {import('express').Response} res 
 */
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
}

/**
 * Middleware que protege endpoints privados.
 * Rechaza cualquier petición sin sesión válida con código 401 Unauthorized. (Punto 6)
 */
function requireAuth(req, res, next) {
  let token = null;

  // 1. Priorizar cookie segura HttpOnly
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } 
  // 2. Aceptar encabezado Authorization: Bearer <token> si proviene de clientes API
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Acceso denegado: Se requiere autenticación válida para acceder a este recurso.'
    });
  }

  try {
    const decoded = jwt.verify(token, getActiveJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'libreria-universal',
      audience: 'libreria-universal-client'
    });

    const config = getAuthConfig();
    if (config.sessions_revoked_at && decoded.iat && decoded.iat < config.sessions_revoked_at) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Todas las sesiones activas han sido cerradas por seguridad. Inicie sesión nuevamente.'
      });
    }

    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token de autenticación expirado o inválido. Inicie sesión nuevamente.'
    });
  }
}

/**
 * Middleware opcional para poblar req.user si existe sesión sin bloquear si no existe.
 */
function optionalAuth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'libreria-universal',
        audience: 'libreria-universal-client'
      });
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  COOKIE_NAME
};
