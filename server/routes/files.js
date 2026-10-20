/**
 * LIBRERÍA UNIVERSAL - RUTAS Y CONTROLADOR DE ARCHIVOS & CATÁLOGOS
 * Permite al administrador subir, listar y eliminar archivos (PDFs, catálogos, imágenes, listas)
 * con almacenamiento persistente en Vercel Blob CDN y registro en base de datos.
 */

const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { db } = require('../db/client');

const router = Router();
const BLOB_FILES_KEY = 'data/files.json';

// Configuración de multer en memoria para subida de archivos (hasta 25MB para catálogos PDF)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  }
});

let inMemoryFiles = null;

/**
 * Obtiene la lista persistente de archivos desde Vercel Blob
 */
async function getStoredFiles() {
  if (inMemoryFiles !== null) {
    return inMemoryFiles;
  }

  try {
    const { list } = require('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_FILES_KEY });
    const fileBlob = blobs.find(b => b.pathname === BLOB_FILES_KEY);
    if (fileBlob) {
      const resp = await fetch(fileBlob.url + '?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          inMemoryFiles = data;
          return inMemoryFiles;
        }
      }
    }
  } catch (err) {
    console.warn('Aviso al leer lista de archivos de Vercel Blob:', err.message);
  }

  inMemoryFiles = [];
  return inMemoryFiles;
}

/**
 * Guarda la lista de archivos en Vercel Blob
 */
async function saveStoredFiles(files) {
  inMemoryFiles = files;
  try {
    const { put } = require('@vercel/blob');
    await put(BLOB_FILES_KEY, JSON.stringify(files, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });
  } catch (err) {
    console.warn('Aviso al guardar lista de archivos en Vercel Blob:', err.message);
  }
}

/**
 * GET /api/files
 * Lista todos los archivos cargados (Público / Admin)
 */
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const files = await getStoredFiles();
    res.json({
      success: true,
      count: files.length,
      files
    });
  } catch (err) {
    console.error('Error al listar archivos:', err);
    res.status(500).json({ error: 'InternalServerError', message: 'No se pudieron recuperar los archivos.' });
  }
});

/**
 * POST /api/files
 * Subir nuevo archivo (PDF, Imagen, Catálogo, Documento) (Solo Admin)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  upload.any(),
  async (req, res) => {
    try {
      const uploadedFile = req.file || (Array.isArray(req.files) && req.files[0]) || (req.files && (
        req.files.file?.[0] || 
        req.files.document?.[0] || 
        req.files.archivo?.[0]
      ));

      if (!uploadedFile) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'No se ha adjuntado ningún archivo para subir.'
        });
      }

      const originalName = uploadedFile.originalname || 'archivo';
      const ext = path.extname(originalName).toLowerCase();
      const uuid = crypto.randomUUID();
      const safeFileName = `${uuid}${ext}`;
      const blobPath = `catalogos/${safeFileName}`;

      let fileUrl = null;

      // 1. Subida a Vercel Blob CDN
      try {
        const { put } = require('@vercel/blob');
        const blob = await put(blobPath, uploadedFile.buffer, {
          access: 'public',
          contentType: uploadedFile.mimetype || 'application/octet-stream',
          addRandomSuffix: false
        });
        fileUrl = blob.url;
      } catch (blobErr) {
        console.error('Error subiendo a Vercel Blob:', blobErr);
        throw new Error('Fallo al subir el archivo a la nube de Vercel Blob.');
      }

      const fileItem = {
        id: uuid,
        name: originalName,
        url: fileUrl,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype || 'application/octet-stream',
        created_at: new Date().toISOString()
      };

      // 2. Guardar en el índice persistente
      const files = await getStoredFiles();
      files.unshift(fileItem);
      await saveStoredFiles(files);

      // 3. Registro en base de datos si está conectada
      try {
        await db.query(
          `INSERT INTO public.uploaded_files (id, user_id, original_name, sanitized_name, storage_path, mime_type, file_size_bytes, url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [uuid, req.user?.id || uuid, originalName, safeFileName, fileUrl, fileItem.mimeType, fileItem.size, fileUrl]
        );
      } catch (dbErr) {
        // Fallback no bloqueante
      }

      res.status(201).json({
        success: true,
        message: 'Archivo cargado y publicado exitosamente en la nube.',
        file: fileItem
      });
    } catch (err) {
      console.error('Error al subir archivo:', err);
      res.status(500).json({ error: 'InternalServerError', message: err.message || 'Error al procesar archivo.' });
    }
  }
);

/**
 * DELETE /api/files/:id
 * Eliminar un archivo subido (Solo Admin)
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      let files = await getStoredFiles();
      const fileIndex = files.findIndex(f => f.id === id);

      if (fileIndex === -1) {
        return res.status(404).json({ error: 'NotFound', message: 'Archivo no encontrado.' });
      }

      const fileToDelete = files[fileIndex];

      // 1. Eliminar de Vercel Blob si tiene URL
      if (fileToDelete.url) {
        try {
          const { del } = require('@vercel/blob');
          await del(fileToDelete.url);
        } catch (delErr) {
          console.warn('Aviso al borrar de Vercel Blob:', delErr.message);
        }
      }

      // 2. Remover del índice persistente
      files.splice(fileIndex, 1);
      await saveStoredFiles(files);

      // 3. Eliminar de BD si está conectada
      try {
        await db.query('DELETE FROM public.uploaded_files WHERE id = $1', [id]);
      } catch (dbErr) {
        // Fallback
      }

      res.json({
        success: true,
        message: 'Archivo eliminado exitosamente.'
      });
    } catch (err) {
      console.error('Error al eliminar archivo:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo eliminar el archivo.' });
    }
  }
);

module.exports = router;
