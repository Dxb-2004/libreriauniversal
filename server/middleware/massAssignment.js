/**
 * LIBRERÍA UNIVERSAL - PROTECCIÓN CONTRA MASS ASSIGNMENT
 * Punto 8: Bloquear la manipulación de campos sensibles en el cuerpo de peticiones.
 */

// Lista negra estricta de campos sensibles que jamás pueden ser inyectados por el cliente
const FORBIDDEN_FIELDS = [
  'role',
  'is_admin',
  'isAdmin',
  'is_staff',
  'isVerified',
  'verified',
  'permissions',
  'user_id',
  'userId',
  'balance',
  'id',
  'created_at',
  'updated_at'
];

/**
 * Middleware que inspecciona el cuerpo de la petición y rechaza cualquier intento
 * malicioso de inyectar campos privilegiados (escalamiento de privilegios).
 */
function preventMassAssignment(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  const injectedKeys = Object.keys(req.body).filter(key => 
    FORBIDDEN_FIELDS.includes(key.toLowerCase()) || FORBIDDEN_FIELDS.includes(key)
  );

  if (injectedKeys.length > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `Intento de asignación masiva bloqueado: Los siguientes campos no pueden ser modificados directamente: ${injectedKeys.join(', ')}`
    });
  }

  next();
}

/**
 * Función DTO (Data Transfer Object) para extraer ÚNICAMENTE los campos permitidos.
 * Garantiza que solo un objeto limpio y explícito viaje hacia la base de datos.
 * @param {object} input 
 * @param {string[]} allowedFields 
 * @returns {object}
 */
function createSafeDTO(input = {}, allowedFields = []) {
  const safe = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      safe[field] = input[field];
    }
  }
  return safe;
}

module.exports = {
  preventMassAssignment,
  createSafeDTO,
  FORBIDDEN_FIELDS
};
