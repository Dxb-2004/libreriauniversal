/**
 * LIBRERÍA UNIVERSAL - CONTROL Y BLINDAJE DE SUBIDA DE ARCHIVOS
 * Punto 16: Restricción estricta de subida de archivos:
 * - Validación de tamaño máximo (5MB)
 * - Verificación de tipo real por Magic Bytes (evita archivos maliciosos renombrados a .png/.pdf)
 * - Renombrado aleatorio con UUID criptográfico
 * - Persistencia resiliente en Vercel Blob (Nube CDN) y almacenamiento local seguro
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const FileType = require('file-type');
const { env } = require('../config/env');

// Directorio seguro local / temporal
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

// Middleware flexible que acepta 'file', 'document', 'image' o 'archivo'
const uploadMiddleware = upload.any();

/**
 * Middleware posterior que valida los MAGIC BYTES reales del buffer en memoria
 * y persiste en Vercel Blob (CDN permanente) o disco local con UUID aleatorio.
 */
async function validateAndPersistFile(req, res, next) {
  const uploadedFile = req.file || (Array.isArray(req.files) && req.files[0]) || (req.files && (
    req.files.file?.[0] || 
    req.files.document?.[0] || 
    req.files.image?.[0] || 
    req.files.archivo?.[0]
  ));

  if (!uploadedFile) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'No se ha adjuntado ningún archivo.'
    });
  }

  try {
    const buffer = uploadedFile.buffer;

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
    const uuid = crypto.randomUUID();
    const safeFileName = `${uuid}${safeExtension}`;
    const blobPath = `uploads/${safeFileName}`;

    // 4. Calcular Hash SHA-256 para verificación de integridad
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    let fileUrl = null;

    // 5. Persistir en Vercel Blob (Nube CDN permanente)
    try {
      const { put } = require('@vercel/blob');
      const blob = await put(blobPath, buffer, {
        access: 'public',
        contentType: detectedType.mime,
        addRandomSuffix: false
      });
      if (blob && blob.url) {
        fileUrl = blob.url;
      }
    } catch (blobErr) {
      console.warn('Vercel Blob no disponible o error:', blobErr.message);
    }

    // 6. Persistir en disco local (fallback para entorno local o desarrollo)
    const destinationPath = path.join(UPLOAD_DIR, safeFileName);
    try {
      await fs.promises.writeFile(destinationPath, buffer, { mode: 0o640 });
      if (!fileUrl) {
        fileUrl = `/uploads/${safeFileName}`;
      }
    } catch (diskErr) {
      // Ignorar si el filesystem es de solo lectura (serverless) ya que usamos Vercel Blob
    }

    req.secureFile = {
      originalName: (uploadedFile.originalname || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_'),
      savedName: safeFileName,
      storagePath: destinationPath,
      mimeType: detectedType.mime,
      sizeBytes: buffer.length,
      sha256: fileHash,
      url: fileUrl || `/uploads/${safeFileName}`
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
  uploadMiddleware,
  validateAndPersistFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_DIR
};
