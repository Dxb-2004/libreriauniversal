/**
 * LIBRERÍA UNIVERSAL - CONTROL DE ACCESO BASADO EN ROLES (RBAC) Y ANTI-IDOR
 * Punto 7: Restringir acceso a registros evitando vulnerabilidades IDOR (Insecure Direct Object Reference).
 */

/**
 * Middleware que verifica que el usuario autenticado tenga uno de los roles permitidos.
 * @param {string[]} allowedRoles - Ej: ['admin', 'staff']
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticación requerida.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Acceso denegado: Su rol no posee los privilegios requeridos.'
      });
    }

    next();
  };
}

/**
 * Middleware para validar que un recurso pertenezca al usuario autenticado (Anti-IDOR).
 * Si el usuario es 'admin', se le permite acceso administrativo.
 * @param {Function} getResourceOwnerIdAsync - Función asíncrona (req) => Promise<string|null>
 */
function verifyResourceOwnership(getResourceOwnerIdAsync) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Los administradores pueden inspeccionar o gestionar registros
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerIdAsync(req);

      if (!ownerId) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'El recurso solicitado no fue encontrado.'
        });
      }

      if (String(ownerId) !== String(req.user.id)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Violación de seguridad IDOR: No tiene autorización para consultar o modificar este registro.'
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Error al verificar la propiedad del recurso.'
      });
    }
  };
}

module.exports = {
  requireRole,
  verifyResourceOwnership
};
