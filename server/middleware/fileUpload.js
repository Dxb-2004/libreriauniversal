/**
 * LIBRERÍA UNIVERSAL - CONTROL Y BLINDAJE DE SUBIDA DE ARCHIVOS
 * Punto 16: Restricción estricta de subida de archivos:
 * - Validación de tamaño máximo (5MB)
 * - Verificación de tipo real por Magic Bytes (evita archivos maliciosos renombrados a .png/.pdf)
 * - Renombrado aleatorio con UUID criptográfico
 * - Almacenamiento fuera del directorio público de ejecución web
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const FileType = require('file-type');
const { env } = require('../config/env');

// Directorio seguro (compatible con entornos Serverless y desarrollo local)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const UPLOAD_DIR = isServerless 
  ? path.resolve('/tmp', 'secure_uploads')
  : path.resolve(process.cwd(), env.UPLOAD_DIRECTORY || './secure_uploads');

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  // Ignorar si el sistema de archivos es de solo lectura
}

// Configuración de almacenamiento en memoria inicial para validación de Magic Bytes
const memoryStorage = multer.memoryStorage();

// Tipos MIME y extensiones estrictamente permitidas para trabajos de imprenta y sellos
const ALLOWED_MIME_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const MAX_FILE_SIZE = (env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024; // 5 MB

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Máximo 1 archivo por petición
  },
  fileFilter: (req, file, cb) => {
    // 1. Validar extensión superficial contra dobles extensiones peligrosas (.php.png, .exe.pdf)
    const originalExt = path.extname(file.originalname).toLowerCase();
    const cleanBasename = path.basename(file.originalname, originalExt);

    if (/\.(php|phtml|exe|sh|bat|cmd|js|vbs|jar|py|cgi)$/i.test(cleanBasename)) {
      return cb(new Error('Archivo rechazado: Detectado patrón malicioso de doble extensión.'));
    }

    if (!Object.values(ALLOWED_MIME_TYPES).includes(originalExt)) {
      return cb(new Error('Extensión no permitida. Solo se aceptan formatos PDF, PNG, JPG y WEBP.'));
    }

    cb(null, true);
  }
});

/**
 * Middleware posterior que valida los MAGIC BYTES reales del buffer en memoria
 * antes de escribirlo en disco con un UUID aleatorio.
 */
async function validateAndPersistFile(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'No se ha adjuntado ningún archivo.'
    });
  }

  try {
    const buffer = req.file.buffer;

    // 2. Inspección profunda de Magic Bytes
    const detectedType = await FileType.fromBuffer(buffer);

    if (!detectedType || !ALLOWED_MIME_TYPES[detectedType.mime]) {
      return res.status(400).json({
        error: 'SecurityViolation',
        message: 'Archivo rechazado: La firma binaria (Magic Bytes) no coincide con un formato de imagen o PDF válido.'
      });
    }

    // 3. Generación de nombre UUID criptográfico aleatorio
    const safeExtension = ALLOWED_MIME_TYPES[detectedType.mime];
    const uniqueFileName = `${crypto.randomUUID()}${safeExtension}`;
    const destinationPath = path.join(UPLOAD_DIR, uniqueFileName);

    // 4. Calcular Hash SHA-256 para verificación de integridad
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 5. Escritura segura en disco con permisos restringidos (no ejecutable)
    await fs.promises.writeFile(destinationPath, buffer, { mode: 0o640 });

    req.secureFile = {
      originalName: req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_'),
      savedName: uniqueFileName,
      storagePath: destinationPath,
      mimeType: detectedType.mime,
      sizeBytes: req.file.size,
      sha256: fileHash
    };

    next();
  } catch (err) {
    console.error('Error al procesar archivo seguro:', err);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Error de procesamiento en la subida segura del archivo.'
    });
  }
}

module.exports = {
  uploadMiddleware: upload.single('document'),
  validateAndPersistFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE
};
