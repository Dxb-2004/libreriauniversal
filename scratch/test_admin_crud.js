/**
 * TEST SUITE: Admin Login, CRUD de Productos y Seguridad
 */

const http = require('http');
const app = require('../server/app');

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO VERIFICACIÓN DEL SISTEMA DE ADMIN Y CRUD DE PRODUCTOS');
  console.log('======================================================================\n');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { ...headers };
      let payload = null;

      if (body) {
        payload = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(url, { method, headers: reqHeaders }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  try {
    // TEST 1: Login con contraseña incorrecta (Debe dar 401)
    const badLogin = await request('POST', '/api/auth/login', {
      email: 'libu.impresiones@gmail.com',
      password: 'ContrasenaIncorrecta123!'
    });
    if (badLogin.status === 401) {
      console.log('✅ [TEST 1] Rechazo de credenciales incorrectas (401 Unauthorized): APROBADO');
    } else {
      throw new Error(`TEST 1 falló con status: ${badLogin.status}`);
    }

    // TEST 2: Login exitoso con credenciales de Administrador
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'libu.impresiones@gmail.com',
      password: 'UniversalAlsina2026!'
    });
    if (adminLogin.status === 200 && adminLogin.body.token && adminLogin.body.user?.role === 'admin') {
      console.log('✅ [TEST 2] Autenticación de Administrador con JWT y rol admin: APROBADO');
    } else {
      throw new Error(`TEST 2 falló: ${JSON.stringify(adminLogin.body)}`);
    }

    const adminToken = adminLogin.body.token;

    // TEST 3: Verificación de sesión en /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    if (meRes.status === 200 && meRes.body.authenticated && meRes.body.user.role === 'admin') {
      console.log('✅ [TEST 3] Validación de sesión activa en /api/auth/me: APROBADO');
    } else {
      throw new Error(`TEST 3 falló: ${JSON.stringify(meRes.body)}`);
    }

    // TEST 4: Consulta pública de productos (GET /api/products)
    const listRes = await request('GET', '/api/products');
    if (listRes.status === 200 && listRes.body.success && Array.isArray(listRes.body.products) && listRes.body.count > 0) {
      console.log(`✅ [TEST 4] Listado público de productos (${listRes.body.count} items cargados): APROBADO`);
    } else {
      throw new Error(`TEST 4 falló: ${JSON.stringify(listRes.body)}`);
    }

    // TEST 5: Protección de creación contra usuarios no autenticados (Debe dar 401)
    const unauthCreate = await request('POST', '/api/products', {
      nombre: 'Producto No Autorizado',
      categoria: 'Sellos',
      precio: 5000
    });
    if (unauthCreate.status === 401) {
      console.log('✅ [TEST 5] Protección de endpoints privados sin token (401 Unauthorized): APROBADO');
    } else {
      throw new Error(`TEST 5 falló con status: ${unauthCreate.status}`);
    }

    // TEST 6: Creación de producto por Administrador (POST /api/products)
    const newProductPayload = {
      nombre: 'Sello Automático Shiny S-842 Test',
      categoria: 'Sellos',
      precio: 13900.50,
      descripcion: 'Sello de prueba automatizada para test suite de Librería Universal.',
      imagen_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500',
      stock: true,
      destacado: true
    };

    const createRes = await request('POST', '/api/products', newProductPayload, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (createRes.status === 201 && createRes.body.success && createRes.body.product?.id) {
      console.log('✅ [TEST 6] Creación de nuevo producto por Administrador: APROBADO');
    } else {
      throw new Error(`TEST 6 falló: ${JSON.stringify(createRes.body)}`);
    }

    const createdId = createRes.body.product.id;

    // TEST 7: Consulta del producto recién creado por ID
    const getOne = await request('GET', `/api/products/${createdId}`);
    if (getOne.status === 200 && getOne.body.product?.nombre === newProductPayload.nombre) {
      console.log('✅ [TEST 7] Consulta individual de producto por ID: APROBADO');
    } else {
      throw new Error(`TEST 7 falló: ${JSON.stringify(getOne.body)}`);
    }

    // TEST 8: Actualización de producto (PUT /api/products/:id)
    const updatePayload = {
      ...newProductPayload,
      nombre: 'Sello Automático Shiny S-842 Test (Actualizado)',
      precio: 15200.00,
      stock: false
    };

    const updateRes = await request('PUT', `/api/products/${createdId}`, updatePayload, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (updateRes.status === 200 && updateRes.body.product?.precio === 15200 && updateRes.body.product?.stock === false) {
      console.log('✅ [TEST 8] Edición completa de producto (PUT): APROBADO');
    } else {
      throw new Error(`TEST 8 falló: ${JSON.stringify(updateRes.body)}`);
    }

    // TEST 9: Alternar Stock Rápido (PATCH /api/products/:id/toggle-stock)
    const toggleRes = await request('PATCH', `/api/products/${createdId}/toggle-stock`, null, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (toggleRes.status === 200 && toggleRes.body.stock === true) {
      console.log('✅ [TEST 9] Alternancia rápida de disponibilidad/stock (PATCH): APROBADO');
    } else {
      throw new Error(`TEST 9 falló: ${JSON.stringify(toggleRes.body)}`);
    }

    // TEST 10: Eliminación de producto (DELETE /api/products/:id)
    const deleteRes = await request('DELETE', `/api/products/${createdId}`, null, {
      'Authorization': `Bearer ${adminToken}`
    });

    if (deleteRes.status === 200 && deleteRes.body.success) {
      console.log('✅ [TEST 10] Eliminación de producto por Administrador (DELETE): APROBADO');
    } else {
      throw new Error(`TEST 10 falló: ${JSON.stringify(deleteRes.body)}`);
    }

    // TEST 11: Verificar que el producto ya no existe (404)
    const checkDeleted = await request('GET', `/api/products/${createdId}`);
    if (checkDeleted.status === 404) {
      console.log('✅ [TEST 11] Confirmación de producto eliminado (404 Not Found): APROBADO');
    } else {
      throw new Error(`TEST 11 falló con status: ${checkDeleted.status}`);
    }

    console.log('\n======================================================================');
    console.log('🏆 TODOS LOS 11 TESTS DEL SISTEMA DE LOGIN Y CRUD DE PRODUCTOS APROBADOS (100%)');
    console.log('======================================================================\n');

  } catch (err) {
    console.error('❌ Error en suite de pruebas:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
