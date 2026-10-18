/**
 * LIBRERÍA UNIVERSAL - RUTAS Y CONTROLADOR DE PRODUCTOS (CRUD)
 * Arquitectura heredada de tesla-computacion con blindaje de ciberseguridad.
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
 * Carga los productos desde el archivo persistente o memoria
 */
function readProductsFromFile() {
  if (inMemoryProducts !== null) {
    return inMemoryProducts;
  }
  try {
    if (fs.existsSync(PRODUCTS_DATA_PATH)) {
      const data = fs.readFileSync(PRODUCTS_DATA_PATH, 'utf8');
      inMemoryProducts = JSON.parse(data || '[]');
      return inMemoryProducts;
    }
  } catch (err) {
    console.error('Error al leer archivo de productos:', err);
  }
  inMemoryProducts = Array.isArray(seedProducts) && seedProducts.length > 0 ? [...seedProducts] : [];
  return inMemoryProducts;
}

/**
 * Guarda los productos en el archivo persistente y memoria
 */
function writeProductsToFile(products) {
  inMemoryProducts = products;
  try {
    const dir = path.dirname(PRODUCTS_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRODUCTS_DATA_PATH, JSON.stringify(products, null, 2), 'utf8');
  } catch (err) {
    // En entornos serverless con sistema de archivos de solo lectura, la memoria mantiene el estado
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
    const { categoria, search, destacado, stock } = req.query;
    let products = readProductsFromFile();

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
    const products = readProductsFromFile();
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

      // 1. Persistir en archivo JSON
      const products = readProductsFromFile();
      products.unshift(newProduct);
      writeProductsToFile(products);

      // 2. Persistir en base de datos PostgreSQL si está conectada
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
      const products = readProductsFromFile();
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
      writeProductsToFile(products);

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
      const products = readProductsFromFile();
      const index = products.findIndex(p => p.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
      }

      products[index].stock = !products[index].stock;
      products[index].updated_at = new Date().toISOString();
      writeProductsToFile(products);

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
 * DELETE /api/products/:id
 * Eliminar producto del catálogo (Protegido: Solo Admin)
 * ══════════════════════════════════════════════════════════════════════════════
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const { id } = req.params;
      let products = readProductsFromFile();
      const exists = products.some(p => p.id === id);

      if (!exists) {
        return res.status(404).json({ error: 'NotFound', message: 'Producto no encontrado.' });
      }

      products = products.filter(p => p.id !== id);
      writeProductsToFile(products);

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
