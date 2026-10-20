/**
 * LIBRERÍA UNIVERSAL - RUTAS Y CONTROLADOR DE HORARIOS DE ATENCIÓN
 * Persistencia en la nube con Vercel Blob y fallback a disco local.
 * Permite al administrador modificar los horarios en vivo desde el panel de control.
 */

const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = Router();
const SCHEDULE_DATA_PATH = path.resolve(__dirname, '../data/schedule.json');
const BLOB_SCHEDULE_KEY = 'data/schedule.json';

const defaultSchedule = {
  weekdays: '9:30 a 13:15 | 16:00 a 19:30 hs',
  saturdays: '10:00 a 13:00 | 16:30 a 19:00 hs',
  sundays: 'Cerrado',
  holidays: 'Consultar por WhatsApp',
  specialNotice: '',
  updatedAt: new Date().toISOString()
};

let inMemorySchedule = null;

// Esquema Zod de validación
const scheduleSchema = z.object({
  weekdays: z.string().min(1, 'El horario de Lunes a Viernes es obligatorio').max(200),
  saturdays: z.string().min(1, 'El horario de Sábados es obligatorio').max(200),
  sundays: z.string().max(200).default('Cerrado'),
  holidays: z.string().max(200).default('Consultar por WhatsApp'),
  specialNotice: z.string().max(500).optional().default('')
});

/**
 * Obtiene los horarios desde Vercel Blob (Nube), archivo local o memoria
 */
async function getSchedule() {
  if (inMemorySchedule !== null) {
    return inMemorySchedule;
  }

  // 1. Intentar cargar desde Vercel Blob
  try {
    const { list } = require('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_SCHEDULE_KEY });
    const scheduleBlob = blobs.find(b => b.pathname === BLOB_SCHEDULE_KEY);
    if (scheduleBlob) {
      const resp = await fetch(scheduleBlob.url + '?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && typeof data === 'object') {
          inMemorySchedule = { ...defaultSchedule, ...data };
          return inMemorySchedule;
        }
      }
    }
  } catch (blobErr) {
    // Modo local o sin credenciales de blob
  }

  // 2. Intentar cargar desde archivo local
  try {
    if (fs.existsSync(SCHEDULE_DATA_PATH)) {
      const data = fs.readFileSync(SCHEDULE_DATA_PATH, 'utf8');
      inMemorySchedule = { ...defaultSchedule, ...JSON.parse(data || '{}') };
      return inMemorySchedule;
    }
  } catch (err) {
    console.error('Error al leer archivo local de horarios:', err);
  }

  // 3. Fallback a valores por defecto
  inMemorySchedule = { ...defaultSchedule };
  return inMemorySchedule;
}

/**
 * Guarda los horarios en Vercel Blob y archivo local
 */
async function saveSchedule(scheduleData) {
  const updated = {
    ...scheduleData,
    updatedAt: new Date().toISOString()
  };

  inMemorySchedule = updated;

  // 1. Vercel Blob
  try {
    const { put } = require('@vercel/blob');
    await put(BLOB_SCHEDULE_KEY, JSON.stringify(updated, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });
  } catch (blobErr) {
    console.warn('Aviso: No se pudo guardar horarios en Vercel Blob:', blobErr.message);
  }

  // 2. Archivo local
  try {
    const dir = path.dirname(SCHEDULE_DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SCHEDULE_DATA_PATH, JSON.stringify(updated, null, 2), 'utf8');
  } catch (err) {
    console.warn('Aviso: No se pudo guardar horarios en archivo local:', err.message);
  }

  return updated;
}

/**
 * GET /api/schedule
 * Público: Retorna los horarios de atención vigentes
 */
router.get('/', async (req, res) => {
  try {
    const schedule = await getSchedule();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({
      success: true,
      schedule
    });
  } catch (err) {
    console.error('Error al consultar horarios:', err);
    res.status(500).json({
      success: false,
      message: 'Error al recuperar los horarios de atención',
      schedule: defaultSchedule
    });
  }
});

/**
 * PUT /api/schedule
 * Protegido: Requiere autenticación de Administrador
 */
router.put('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const parseResult = scheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos de horario inválidos',
        errors: parseResult.error.format()
      });
    }

    const saved = await saveSchedule(parseResult.data);

    res.status(200).json({
      success: true,
      message: 'Horarios de atención actualizados con éxito en la web',
      schedule: saved
    });
  } catch (err) {
    console.error('Error al actualizar horarios:', err);
    res.status(500).json({
      success: false,
      message: 'Error interno al guardar los horarios'
    });
  }
});

module.exports = router;
