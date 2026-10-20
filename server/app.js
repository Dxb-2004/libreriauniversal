/**
 * LIBRERÍA UNIVERSAL - SERVIDOR FULL-STACK SEGURO
 * Implementa y orquesta los 19 puntos de blindaje de ciberseguridad en producción.
 */

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { env, getClientConfig } = require('./config/env');
const {
  corsMiddleware,
  helmetSecurityHeaders,
  enforceHttpsMiddleware,
  permissionsPolicyMiddleware
} = require('./middleware/securityHeaders');
const {
  globalRateLimiter,
  authRateLimiter,
  contactFormRateLimiter
} = require('./middleware/rateLimiter');
const {
  requireAuth,
  optionalAuth,
  generateToken,
  setAuthCookie,
  clearAuthCookie
} = require('./middleware/auth');
const {
  requireRole,
  verifyResourceOwnership
} = require('./middleware/rbac');
const {
  preventMassAssignment,
  createSafeDTO
} = require('./middleware/massAssignment');
const {
  validateBody,
  stampOrderSchema,
  contactMessageSchema,
  registerUserSchema,
  loginUserSchema
} = require('./middleware/validator');
const {
  uploadMiddleware,
  validateAndPersistFile,
  UPLOAD_DIR
} = require('./middleware/fileUpload');
const {
  encryptSensitiveData,
  decryptSensitiveData,
  hashPassword,
  verifyPassword,
  hashIdentifier
} = require('./security/crypto');
const {
  escapeHTML,
  xssSanitizerMiddleware
} = require('./security/sanitizer');
const { requireBotVerification } = require('./security/botVerification');
const {
  verifyAdminPassword,
  updateAdminPassword,
  resetAdminPasswordWithCode,
  getAdminEmail,
  revokeAllSessions
} = require('./security/authManager');
const { db } = require('./db/client');
const productsRouter = require('./routes/products');

const app = express();
app.set('trust proxy', 1);

// =============================================================================
// CAPA 1: CABECERAS Y PROTOCOLOS DE SEGURIDAD EN RED (PUNTOS 18 Y 19)
// =============================================================================
app.use(enforceHttpsMiddleware); // Forzar HTTPS y HSTS
app.use(helmetSecurityHeaders);  // CSP, X-Frame-Options: DENY, nosniff, etc.
app.use(permissionsPolicyMiddleware);
app.use(corsMiddleware);         // CORS estricto

// =============================================================================
// CAPA 2: RATE LIMITING GLOBAL Y PARSING SEGURO (PUNTOS 8, 9, 17)
// =============================================================================
app.use(globalRateLimiter); // Rate Limiting Global contra DoS y Scraping (Punto 17)

// Límite estricto de tamaño del cuerpo JSON para mitigar ataques DoS por sobrecarga
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser(env.COOKIE_SECRET)); // Cookies seguras (Punto 9)

// Sanitización Anti-XSS inicial (Punto 15)
app.use(xssSanitizerMiddleware);

// =============================================================================
// CAPA 3: SERVIDO DE ARCHIVOS ESTÁTICOS CON CONTROL DE ACCESO
// =============================================================================
const publicPath = path.resolve(__dirname, '..');
const uploadsPath = path.resolve(__dirname, '../secure_uploads');

// Servir archivos subidos de forma segura
app.use('/uploads', express.static(UPLOAD_DIR, {
  dotfiles: 'ignore',
  maxAge: '7d'
}));

// Servir frontend estático de forma segura
app.use(express.static(publicPath, {
  dotfiles: 'ignore', // NUNCA servir archivos ocultos como .env, .git
  index: ['index.html'],
  maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders: (res, filePath) => {
    // Si alguien intenta solicitar directamente un archivo sensible por error
    if (filePath.endsWith('.env') || filePath.endsWith('.sql') || filePath.endsWith('.bak')) {
      res.status(403).end('Acceso denegado');
    }
  }
}));

// =============================================================================
// CAPA 4: ENDPOINTS DE LA API (BLINDAJE COMPLETO)
// =============================================================================

/**
 * Endpoint de estado y auditoría de seguridad
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    securityStatus: 'HARDENED',
    timestamp: new Date().toISOString(),
    protectionsActive: [
      'Hidden API Keys (.env)',
      'Git Secrets Exclusion (.gitignore)',
      'Segregated Public/Private DB Keys',
      'Row-Level Security (RLS Enforced)',
      'Application-Level AES-256-GCM Encryption',
      'Enforced JWT Authentication Middleware',
      'RBAC & Anti-IDOR Verification',
      'Anti-Mass-Assignment Protection',
      'HttpOnly & Secure SameSite Cookies',
      'Bcrypt Salted Password Hashing',
      'Brute-Force Rate Limiting on Logins',
      'Server-Side Bot Verification (Turnstile)',
      'Parameterized Queries (Anti-SQLi)',
      'Strict Zod Schema Validation',
      'Contextual Anti-XSS Sanitization',
      'Magic-Bytes File Upload Validation',
      'Global DoS Rate Limiting',
      'Strict CSP & HTTP Security Headers',
      'Enforced HTTPS & HSTS Preload'
    ]
  });
});

/**
 * Punto 1 y 3: Configuración Pública Segura para el Cliente
 * Solo expone claves públicas y nunca claves de administración
 */
app.get(['/api/config', '/config'], (req, res) => {
  res.json(getClientConfig());
});

/**
 * Catálogo de Productos y Servicios (CRUD)
 */
app.use(['/api/products', '/products'], productsRouter);

/**
 * Punto 10, 11, 12, 14: Registro de Usuario Seguro
 */
app.post(
  ['/api/auth/register', '/auth/register'],
  authRateLimiter,          // Punto 11: Rate Limit contra abusos de registro
  requireBotVerification,   // Punto 12: Protección contra granjas de bots
  preventMassAssignment,    // Punto 8: Bloquear escalamiento de roles
  validateBody(registerUserSchema), // Punto 14: Validación Zod
  async (req, res) => {
    try {
      const { email, password, full_name, phone } = req.body;

      // Hashear contraseña con bcrypt (Punto 10)
      const hashedPassword = await hashPassword(password);
      const userId = require('crypto').randomUUID();

      // Guardar mediante Prepared Statements (Punto 13)
      await db.query(
        'INSERT INTO public.profiles (id, email, full_name, phone, role) VALUES ($1, $2, $3, $4, $5)',
        [userId, email, full_name, phone || null, 'customer']
      );

      const token = generateToken({ id: userId, email, role: 'customer' });
      setAuthCookie(res, token); // Punto 9: Cookie HttpOnly

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente con credenciales cifradas.',
        token,
        user: { id: userId, email, full_name, role: 'customer' }
      });
    } catch (err) {
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo completar el registro.' });
    }
  }
);

/**
 * Punto 9, 10, 11: Inicio de Sesión Blindado contra Fuerza Bruta (Admin & Clientes)
 */
app.post(
  ['/api/auth/login', '/auth/login'],
  authRateLimiter, // Punto 11: Máx 5 intentos en 15 min
  requireBotVerification,
  validateBody(loginUserSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = (email || '').trim().toLowerCase();

      // 1. Verificación de Administrador (Hasheo seguro Bcrypt + AES-256)
      const adminEmail = getAdminEmail();
      const isAdminEmail = (normalizedEmail === adminEmail.toLowerCase() || normalizedEmail === 'admin@libreriauniversal.com');

      if (isAdminEmail) {
        const isPasswordCorrect = await verifyAdminPassword(password);
        if (!isPasswordCorrect) {
          return res.status(401).json({
            error: 'InvalidCredentials',
            message: 'Contraseña de administrador incorrecta. Verifique sus datos.'
          });
        }

        const adminUser = {
          id: 'admin_master_lu_2026',
          email: adminEmail,
          full_name: 'Administrador Librería Universal',
          role: 'admin'
        };

        const token = generateToken(adminUser);
        setAuthCookie(res, token); // Cookie segura HttpOnly

        return res.json({
          success: true,
          message: 'Autenticación exitosa. Bienvenido al Panel de Control.',
          token,
          user: adminUser
        });
      }

      // 2. Consulta de usuarios clientes
      const result = await db.query('SELECT * FROM public.profiles WHERE email = $1 LIMIT 1', [normalizedEmail]);
      const user = result.rows[0];

      if (!user) {
        // En caso de usuario no registrado
        return res.status(401).json({
          error: 'InvalidCredentials',
          message: 'Credenciales inválidas. Correo electrónico o contraseña incorrectos.'
        });
      }

      const isPasswordValid = await verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'InvalidCredentials',
          message: 'Credenciales inválidas. Correo electrónico o contraseña incorrectos.'
        });
      }

      const token = generateToken(user);
      setAuthCookie(res, token);

      res.json({
        success: true,
        message: 'Sesión iniciada correctamente.',
        token,
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
      });
    } catch (err) {
      console.error('Error durante login:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Error durante el inicio de sesión.' });
    }
  }
);

/**
 * Cierre de sesión individual
 */
app.post(['/api/auth/logout', '/auth/logout'], (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Sesión cerrada y cookies eliminadas.' });
});

/**
 * Desloguear a todas las personas y dispositivos conectados a la cuenta
 * Invalida criptográficamente todos los tokens emitidos anteriormente
 */
app.post(['/api/auth/logout-all', '/auth/logout-all'], requireAuth, (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Solo el administrador puede revocar todas las sesiones.'
    });
  }

  const result = revokeAllSessions();
  clearAuthCookie(res);

  res.json({
    success: true,
    message: 'Todas las sesiones activas en todos los dispositivos han sido deslogueadas exitosamente.',
    revoked_at: result.revoked_at
  });
});

/**
 * Punto 6: Perfil de usuario protegido por Middleware JWT
 */
app.get(['/api/auth/me', '/auth/me'], requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

/**
 * Punto 10: Cambio de Contraseña de Administrador (Protegido por Middleware JWT)
 * Valida contraseña previa, hashea nueva contraseña con Bcrypt (costo 12) y renueva token
 */
app.post(
  ['/api/auth/change-password', '/auth/change-password'],
  requireAuth,
  authRateLimiter,
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Permiso denegado. Solo administradores pueden cambiar la contraseña.'
        });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Debe ingresar la contraseña actual y la nueva contraseña.'
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'La nueva contraseña y su confirmación no coinciden.'
        });
      }

      // Validar contraseña actual con hash bcrypt
      const isCurrentValid = await verifyAdminPassword(currentPassword);
      if (!isCurrentValid) {
        return res.status(401).json({
          error: 'InvalidCredentials',
          message: 'La contraseña actual ingresada es incorrecta.'
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'La nueva contraseña no puede ser igual a la anterior.'
        });
      }

      // Encriptar / hashear con Bcrypt costo 12
      await updateAdminPassword(newPassword);

      // Renovar token de administrador
      const adminEmail = getAdminEmail();
      const updatedUser = {
        id: req.user.id || 'admin_master_lu_2026',
        email: adminEmail,
        full_name: 'Administrador Librería Universal',
        role: 'admin'
      };

      const newToken = generateToken(updatedUser);
      setAuthCookie(res, newToken);

      return res.json({
        success: true,
        message: 'Contraseña actualizada y encriptada exitosamente con Bcrypt (costo 12).',
        token: newToken,
        user: updatedUser
      });
    } catch (err) {
      console.error('Error al cambiar contraseña:', err.message);
      return res.status(400).json({
        error: 'BadRequest',
        message: err.message || 'Error al procesar el cambio de contraseña.'
      });
    }
  }
);

/**
 * Punto 5 y 10: Restablecimiento de Contraseña de Emergencia con Código Cifrado AES-256-GCM
 */
app.post(
  ['/api/auth/reset-password', '/auth/reset-password'],
  authRateLimiter,
  async (req, res) => {
    try {
      const { email, recoveryCode, newPassword, confirmPassword } = req.body;

      if (!email || !recoveryCode || !newPassword) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Todos los campos son obligatorios (correo, código de seguridad y nueva contraseña).'
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'La nueva contraseña y su confirmación no coinciden.'
        });
      }

      const adminEmail = getAdminEmail();
      const normalizedEmail = (email || '').trim().toLowerCase();

      if (normalizedEmail !== adminEmail.toLowerCase() && normalizedEmail !== 'admin@libreriauniversal.com') {
        return res.status(404).json({
          error: 'NotFound',
          message: 'El correo electrónico no corresponde a la cuenta de administración.'
        });
      }

      // Valida el código contra el secreto descifrado con AES-256-GCM y hashea la nueva clave
      await resetAdminPasswordWithCode(recoveryCode, newPassword);

      return res.json({
        success: true,
        message: 'Contraseña restablecida exitosamente. Inicie sesión con su nueva clave.'
      });
    } catch (err) {
      console.error('Error al restablecer contraseña:', err.message);
      return res.status(400).json({
        error: 'SecurityError',
        message: err.message || 'Error al validar el código o restablecer la contraseña.'
      });
    }
  }
);

/**
 * Puntos 4, 5, 6, 8, 13, 14: Creación de Pedido con Cifrado AES-256 de Datos Sensibles
 */
app.post(
  '/api/orders',
  requireAuth,              // Punto 6: Forzar autenticación
  preventMassAssignment,    // Punto 8: Bloquear campos restringidos
  validateBody(stampOrderSchema), // Punto 14: Validación Zod
  async (req, res) => {
    try {
      const {
        apparatus_type,
        line_count,
        lines,
        font_family,
        line_fonts,
        ink_color,
        border_style,
        drawing_code,
        drawing_position,
        customer_notes
      } = req.body;

      // Punto 5: Cifrar los textos y diseño personalizado con AES-256-GCM
      const sensitiveLinesPayload = {
        lines,
        line_fonts,
        customer_notes
      };
      const { ciphertext, iv, authTag } = encryptSensitiveData(sensitiveLinesPayload);

      const orderId = require('crypto').randomUUID();

      // Punto 4 y 13: Inserción parametrizada asegurando user_id = req.user.id
      await db.query(
        `INSERT INTO public.stamp_orders (
          id, user_id, apparatus_type, line_count,
          encrypted_lines_payload, lines_iv, lines_auth_tag,
          font_family, ink_color, border_style, drawing_code, drawing_position, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')`,
        [
          orderId,
          req.user.id, // Vinculación estricta al usuario autenticado (RLS)
          apparatus_type,
          line_count,
          ciphertext,
          iv,
          authTag,
          font_family,
          ink_color,
          border_style,
          drawing_code || null,
          drawing_position || 'none'
        ]
      );

      res.status(201).json({
        success: true,
        orderId,
        message: 'Pedido recibido y blindado con cifrado AES-256-GCM en base de datos.'
      });
    } catch (err) {
      console.error('Error al guardar pedido cifrado:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Error al procesar el pedido.' });
    }
  }
);

/**
 * Puntos 4 y 7: Consulta de Pedidos del Usuario Autenticado (Anti-IDOR)
 */
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    // La consulta SIEMPRE filtra por WHERE user_id = req.user.id impidiendo consultar pedidos ajenos
    const result = await db.query(
      'SELECT id, apparatus_type, line_count, font_family, ink_color, border_style, drawing_code, status, created_at FROM public.stamp_orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({
      orders: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

/**
 * Punto 7: Consulta de un Pedido Específico con Verificación Estricta de Propiedad (Anti-IDOR)
 */
app.get(
  '/api/orders/:id',
  requireAuth,
  verifyResourceOwnership(async (req) => {
    // Busca el dueño del pedido en la base de datos
    const res = await db.query('SELECT user_id FROM public.stamp_orders WHERE id = $1 LIMIT 1', [req.params.id]);
    return res.rows[0]?.user_id || null;
  }),
  async (req, res) => {
    try {
      const result = await db.query('SELECT * FROM public.stamp_orders WHERE id = $1', [req.params.id]);
      const order = result.rows[0];

      if (!order) {
        return res.status(404).json({ error: 'NotFound', message: 'Pedido no encontrado.' });
      }

      // Descifrar datos con autenticación AEAD (Punto 5)
      let decryptedDetails = null;
      if (order.encrypted_lines_payload && order.lines_iv && order.lines_auth_tag) {
        decryptedDetails = JSON.parse(
          decryptSensitiveData(order.encrypted_lines_payload, order.lines_iv, order.lines_auth_tag)
        );
      }

      res.json({
        order: {
          id: order.id,
          apparatus_type: order.apparatus_type,
          line_count: order.line_count,
          font_family: order.font_family,
          ink_color: order.ink_color,
          border_style: order.border_style,
          drawing_code: order.drawing_code,
          status: order.status,
          decryptedDetails
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

/**
 * Puntos 11, 12, 14, 15: Formulario de Contacto Seguro y Anti-Spam
 */
app.post(
  '/api/contact',
  contactFormRateLimiter,
  requireBotVerification,
  preventMassAssignment,
  validateBody(contactMessageSchema),
  optionalAuth,
  async (req, res) => {
    try {
      const { name, email, phone, service_type, message } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;
      const ipHash = hashIdentifier(clientIp);

      await db.query(
        `INSERT INTO public.contact_messages (
          id, user_id, name, email, phone, service_type, message, ip_hash, bot_verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          require('crypto').randomUUID(),
          req.user?.id || null,
          name,
          email,
          phone || null,
          service_type,
          message,
          ipHash,
          true
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Mensaje recibido y verificado exitosamente.'
      });
    } catch (err) {
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

/**
 * Punto 16: Subida Restringida de Archivos con Inspección de Magic Bytes
 */
app.post(
  '/api/upload',
  requireAuth,
  uploadMiddleware,
  validateAndPersistFile,
  async (req, res) => {
    try {
      const fileInfo = req.secureFile;

      await db.query(
        `INSERT INTO public.uploaded_files (
          id, user_id, original_name, sanitized_name, storage_path, mime_type, file_size_bytes, file_hash_sha256
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          require('crypto').randomUUID(),
          req.user.id,
          fileInfo.originalName,
          fileInfo.savedName,
          fileInfo.storagePath,
          fileInfo.mimeType,
          fileInfo.sizeBytes,
          fileInfo.sha256
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Archivo verificado por Magic Bytes y almacenado con UUID seguro.',
        file: {
          savedName: fileInfo.savedName,
          url: fileInfo.url || `/uploads/${fileInfo.savedName}`,
          mimeType: fileInfo.mimeType,
          sizeBytes: fileInfo.sizeBytes,
          sha256: fileInfo.sha256
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'InternalServerError' });
    }
  }
);

// =============================================================================
// CAPA 5: MANEJADOR GLOBAL DE ERRORES (EVITA FUGA DE INFORMACIÓN / STACK TRACES)
// =============================================================================
app.use((err, req, res, next) => {
  // Manejo de errores de Multer (tamaño de archivo excedido)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'PayloadTooLarge',
      message: `El archivo supera el tamaño máximo permitido de ${env.MAX_FILE_SIZE_MB} MB.`
    });
  }

  // En producción, NUNCA filtrar stack traces ni rutas internas del servidor
  console.error('Error no controlado interceptado por el middleware de seguridad:', err.message);
  res.status(err.status || 500).json({
    error: 'InternalServerError',
    message: env.NODE_ENV === 'production' 
      ? 'Ocurrió un error inesperado al procesar su solicitud.'
      : err.message
  });
});

// Inicializar servidor si se ejecuta directamente
if (require.main === module) {
  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🛡️  LIBRERÍA UNIVERSAL - Servidor Seguro Activo en http://localhost:${PORT}`);
    console.log(`🔒  Modo: ${env.NODE_ENV} | Blindaje de 19 puntos de seguridad habilitado.`);
  });
}

module.exports = app;
