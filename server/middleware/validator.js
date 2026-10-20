/**
 * LIBRERÍA UNIVERSAL - VALIDACIÓN ESTRICTA DE ENTRADAS CON ZOD
 * Punto 14: Validación rigurosa de esquemas, tipos, formatos de email y longitudes máximas.
 */

const { z } = require('zod');

// Esquema para Pedido de Sello Personalizado
const stampOrderSchema = z.object({
  apparatus_type: z.enum(['automatico', 'madera'], {
    errorMap: () => ({ message: 'El tipo de aparato debe ser "automatico" o "madera".' })
  }),
  line_count: z.number().int().min(1).max(4, {
    message: 'La cantidad de líneas debe estar entre 1 y 4.'
  }),
  lines: z.array(
    z.string().trim().max(60, { message: 'Cada línea de texto no puede superar los 60 caracteres.' })
  ).min(1).max(4),
  font_family: z.string().trim().max(40).default('font-stamp-01'),
  line_fonts: z.array(z.string().trim().max(40)).optional().default([]),
  ink_color: z.enum(['#0f172a', '#1e40af', '#b91c1c', '#6b21a8', '#000000'], {
    errorMap: () => ({ message: 'Color de tinta inválido. Opciones: Negro, Azul, Rojo, Violeta.' })
  }),
  border_style: z.enum(['dashed', 'solid', 'rounded', 'none'], {
    errorMap: () => ({ message: 'Estilo de borde inválido.' })
  }),
  drawing_code: z.string().trim().max(20).optional().nullable(),
  drawing_position: z.enum(['none', 'left', 'right']).default('none'),
  customer_notes: z.string().trim().max(500, {
    message: 'Las notas del pedido no pueden superar los 500 caracteres.'
  }).optional().default('')
}).strict(); // Rechaza cualquier campo adicional no declarado

// Esquema para Mensaje de Contacto / Cotización
const contactMessageSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'Nombre demasiado largo.'),
  email: z.string().trim().email('El formato de correo electrónico es inválido.').max(100),
  phone: z.string().trim().regex(/^(\+?[0-9\s-]{8,20})?$/, 'Número telefónico inválido.').optional().nullable(),
  service_type: z.string().trim().max(50).default('impresiones'),
  message: z.string().trim().min(5, 'El mensaje debe tener al menos 5 caracteres.').max(1500, 'Mensaje demasiado largo (máximo 1500 caracteres).'),
  'cf-turnstile-response': z.string().optional()
}).strict();

// Esquema de Registro de Usuario
const registerUserSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido.').max(100),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(100, 'La contraseña no puede exceder 100 caracteres.')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula.')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número.'),
  full_name: z.string().trim().min(3).max(80),
  phone: z.string().trim().optional()
}).strict();

// Esquema de Inicio de Sesión (Acceso directo con contraseña para administrador)
const loginUserSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido.').optional(),
  password: z.string().min(1, 'La contraseña es requerida.').max(100),
  'cf-turnstile-response': z.string().optional()
}).strict();

/**
 * Middleware generador para validar el cuerpo de peticiones contra un esquema Zod.
 * @param {z.ZodSchema} schema 
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const formattedErrors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        error: 'ValidationError',
        message: 'Los datos proporcionados no superaron la validación de seguridad.',
        details: formattedErrors
      });
    }

    // Sobrescribe req.body con los datos validados y limpiados por Zod
    req.body = result.data;
    next();
  };
}

module.exports = {
  validateBody,
  stampOrderSchema,
  contactMessageSchema,
  registerUserSchema,
  loginUserSchema
};
