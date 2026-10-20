/**
 * LIBRERÍA UNIVERSAL - RUTAS Y CONTROLADOR DE PRODUCTOS (CRUD)
 * Persistencia real en la nube con Vercel Blob y fallback a disco local.
 */

const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const { z } = require('zod');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validateBody } = require('../middleware/validator');
const { db } = require('../db/client');

const router = Router();
const PRODUCTS_DATA_PATH = path.resolve(__dirname, '../data/products.json');
const BLOB_PRODUCTS_KEY = 'data/products.json';

// Categorías oficiales según especificación
const ALLOWED_CATEGORIES = [
  'Librería Comercial',
  'Librería Escolar',
  'Servicios de Imprenta',
  'Sellos',
  'Insumos / Otros'
];

// Esquema Zod de Validación para Creación / Edición
const productSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200),
  categoria: z.enum([
    'Librería Comercial',
    'Librería Escolar',
    'Servicios de Imprenta',
    'Sellos',
    'Insumos / Otros'
  ], {
    errorMap: () => ({ message: 'Categoría no válida. Seleccione una de las 5 categorías oficiales.' })
  }),
  precio: z.coerce.number().min(0, 'El precio no puede ser negativo').default(0),
  descripcion: z.string().max(2000).optional().default(''),
  imagen_url: z.string().optional().default(''),
  stock: z.boolean().default(true),
  destacado: z.boolean().default(false)
});

let seedProducts = [];
try {
  seedProducts = require('../data/products.json');
} catch (e) {
  seedProducts = [];
}

let inMemoryProducts = null;

/**
 * Carga los productos desde Vercel Blob (Nube), archivo persistente o memoria
 */
async function getProducts() {
  if (inMemoryProducts !== null) {
    return inMemoryProducts;
  }

  // 1. Intentar cargar desde Vercel Blob (Persistencia Real en la Nube de Vercel)
  try {
    const { list } = require('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PRODUCTS_KEY });
    const productBlob = blobs.find(b => b.pathname === BLOB_PRODUCTS_KEY);
    if (productBlob) {
      const resp = await fetch(productBlob.url + '?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          inMemoryProducts = data;
          return inMemoryProducts;
        }
      }
    }
  } catch (blobErr) {
    // Si no está disponible Blob (desarrollo local sin credenciales), continuamos al archivo local
  }

  // 2. Intentar cargar desde archivo local (desarrollo o fallback inicial)
  try {
    if (fs.existsSync(PRODUCTS_DATA_PATH)) {
      const data = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf8');
      inMemoryProducts = JSON.parse(data || '[]');
      return inMemoryProducts;
    }
  } catch (err) {
    console.error('Error al leer archivo local de productos:', err);
  }

  // 3. Fallback a semilla inicial
  inMemoryProducts = Array.isArray(seedProducts) && seedProducts.length > 0 ? [...seedProducts] : [];
  return inMemoryProducts;
}

/**
 * Guarda los productos en Vercel Blob (Nube), archivo persistente y memoria
 */
async function saveProducts(products) {
  inMemoryProducts = products;

  // 1. Persistir en Vercel Blob (Persistencia Real en la Nube)
  try {
    const { put } = require('@vercel/blob');
    await put(BLOB_PRODUCTS_KEY, JSON.stringify(products, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json'
    });
  } catch (blobErr) {
    console.warn('Aviso: No se pudo guardar en Vercel Blob:', blobErr.message);
  }

  // 2. Persistir en disco local si el entorno lo permite
  try {
    const dir = path.dirname(PRODUCTS_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRODUCTS_DATA_PATH, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    // En filesystem de solo lectura (serverless) es normal que falle
  }
}

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GET /api/products
 * Lista pública de productos con filtrado por categoría, búsqueda y destacados
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.get('/', async (req, res) => {
  try {
    // Evitar caché stale en proxies y navegadores
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const { categoria, search, destacado, stock } = req.query;
    let products = await getProducts();

    // Filtro por categoría
    if (categoria && categoria !== 'Todas') {
      products = products.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase());
    }

    // Filtro por destacados
    if (destacado === 'true') {
      products = products.filter(p => p.destacado === true);
    }

    // Filtro por disponibilidad
    if (stock === 'true') {
      products = products.filter(p => p.stock === true);
    } else if (stock === 'false') {
      products = products.filter(p => p.stock === false);
    }

    // Búsqueda por texto (nombre o descripción)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      products = products.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q)) ||
        (p.categoria && p.categoria.toLowerCase().includes(q))
      );
    }

    // Ordenar: destacados primero, luego los más recientes
    products.sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    res.json({
      success: true,
      count: products.length,
      categories: ALLOWED_CATEGORIES,
      products
    });
  } catch (err) {
    console.error('Error al listar productos:', err);
    res.status(500).json({ error: 'InternalServerError', message: 'No se pudieron recuperar los productos.' });
  }
});

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * GET /api/products/:id
 * Detalle público de un producto por ID
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.get('/:id', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    const products = await getProducts();
    const product = products.find(p => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
    }

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: 'InternalServerError', message: 'Error al consultar producto.' });
  }
});

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * POST /api/products
 * Crear nuevo producto (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validateBody(productSchema),
  async (req, res) => {
    try {
      const { nombre, categoria, precio, descripcion, imagen_url, stock, destacado } = req.body;
      const crypto = require('crypto');
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newProduct = {
        id: newId,
        nombre: nombre.trim(),
        categoria,
        precio: Number(precio) || 0,
        descripcion: (descripcion || '').trim(),
        imagen_url: (imagen_url || '').trim() || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=80',
        stock: stock !== false,
        destacado: destacado === true,
        created_at: now,
        updated_at: now
      };

      // Persistir en Vercel Blob y memoria
      const products = await getProducts();
      products.unshift(newProduct);
      await saveProducts(products);

      // Persistir en base de datos PostgreSQL si está conectada
      try {
        await db.query(
          `INSERT INTO public.products (id, nombre, categoria, precio, descripcion, imagen_url, stock, destacado, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [newProduct.id, newProduct.nombre, newProduct.categoria, newProduct.precio, newProduct.descripcion, newProduct.imagen_url, newProduct.stock, newProduct.destacado, now, now]
        );
      } catch (dbErr) {
        // Fallback no bloqueante si DB externa no está en vivo
      }

      res.status(201).json({
        success: true,
        message: 'Producto creado y publicado exitosamente.',
        product: newProduct
      });
    } catch (err) {
      console.error('Error al crear producto:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo crear el producto.' });
    }
  }
);

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PUT /api/products/:id
 * Editar producto existente (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validateBody(productSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, categoria, precio, descripcion, imagen_url, stock, destacado } = req.body;
      const products = await getProducts();
      const index = products.findIndex(p => p.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
      }

      const updatedProduct = {
        ...products[index],
        nombre: nombre.trim(),
        categoria,
        precio: Number(precio) || 0,
        descripcion: (descripcion || '').trim(),
        imagen_url: (imagen_url || '').trim() || products[index].imagen_url,
        stock: stock !== false,
        destacado: destacado === true,
        updated_at: new Date().toISOString()
      };

      products[index] = updatedProduct;
      await saveProducts(products);

      // Actualizar en base de datos relacional si está activa
      try {
        await db.query(
          `UPDATE public.products 
           SET nombre = $1, categoria = $2, precio = $3, descripcion = $4, imagen_url = $5, stock = $6, destacado = $7, updated_at = NOW()
           WHERE id = $8`,
          [updatedProduct.nombre, updatedProduct.categoria, updatedProduct.precio, updatedProduct.descripcion, updatedProduct.imagen_url, updatedProduct.stock, updatedProduct.destacado, id]
        );
      } catch (dbErr) {
        // Fallback no bloqueante
      }

      res.json({
        success: true,
        message: 'Producto actualizado correctamente.',
        product: updatedProduct
      });
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo actualizar el producto.' });
    }
  }
);

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * PATCH /api/products/:id/toggle-stock
 * Alternar rápidamente la disponibilidad (Stock) (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.patch(
  '/:id/toggle-stock',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const products = await getProducts();
      const index = products.findIndex(p => p.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
      }

      products[index].stock = !products[index].stock;
      products[index].updated_at = new Date().toISOString();
      await saveProducts(products);

      try {
        await db.query(
          'UPDATE public.products SET stock = $1, updated_at = NOW() WHERE id = $2',
          [products[index].stock, id]
        );
      } catch (dbErr) {
        // Fallback
      }

      res.json({
        success: true,
        message: `Disponibilidad cambiada a: ${products[index].stock ? 'En Stock' : 'Sin Stock / Por encargue'}`,
        stock: products[index].stock
      });
    } catch (err) {
      res.status(500).json({ error: 'InternalServerError', message: 'Error al cambiar stock.' });
    }
  }
);

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DELETE /api/products
 * Vaciar todo el catálogo de productos (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.delete(
  '/',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      await saveProducts([]);

      try {
        await db.query('DELETE FROM public.products');
      } catch (dbErr) {
        // Fallback
      }

      res.json({
        success: true,
        message: 'Catálogo vaciado exitosamente. Ahora puedes cargar tus propios productos desde cero.'
      });
    } catch (err) {
      console.error('Error al vaciar catálogo:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo vaciar el catálogo.' });
    }
  }
);

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DELETE /api/products/:id
 * Eliminar producto individual del catálogo (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      let products = await getProducts();
      const exists = products.some(p => p.id === id);

      if (!exists) {
        return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
      }

      products = products.filter(p => p.id !== id);
      await saveProducts(products);

      try {
        await db.query('DELETE FROM public.products WHERE id = $1', [id]);
      } catch (dbErr) {
        // Fallback
      }

      res.json({
        success: true,
        message: 'Producto eliminado del catálogo exitosamente.'
      });
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'No se pudo eliminar el producto.' });
    }
  }
);

module.exports = router;
