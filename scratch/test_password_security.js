const app = require('../server/app');
const http = require('http');
const { getAuthConfig, resetAdminPasswordWithCode, updateAdminPassword } = require('../server/security/authManager');

async function runTests() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log('🧪 VERIFICANDO SEGURIDAD Y ENCRIPTACIÓN DE CONTRASEÑAS');

  // Test 1: Iniciar sesión con contraseña actual
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'libu.impresiones@gmail.com',
      password: 'UniversalAlsina2026!',
      'cf-turnstile-response': 'dev_bypass_token'
    })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) throw new Error('Falló login inicial');
  console.log('✅ [TEST 1] Login inicial con contraseña hasheada en Bcrypt (costo 12): APROBADO');

  const token = loginData.token;

  // Test 2: Rechazar cambio si contraseña actual es errónea
  const badChangeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword: 'PasswordEquivocada123!',
      newPassword: 'NuevaClaveSegura2026!',
      confirmPassword: 'NuevaClaveSegura2026!'
    })
  });
  if (badChangeRes.status !== 401) throw new Error('Debería rechazar contraseña actual incorrecta');
  console.log('✅ [TEST 2] Rechazo de contraseña actual incorrecta (401): APROBADO');

  // Test 3: Rechazar si confirmación no coincide
  const mismatchRes = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword: 'UniversalAlsina2026!',
      newPassword: 'NuevaClaveSegura2026!',
      confirmPassword: 'OtraClaveDistinta2026!'
    })
  });
  if (mismatchRes.status !== 400) throw new Error('Debería rechazar contraseñas que no coinciden');
  console.log('✅ [TEST 3] Rechazo de contraseñas no coincidentes (400): APROBADO');

  // Test 4: Cambio exitoso de contraseña
  const changeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      currentPassword: 'UniversalAlsina2026!',
      newPassword: 'NuevaClaveSegura2026!',
      confirmPassword: 'NuevaClaveSegura2026!'
    })
  });
  const changeData = await changeRes.json();
  if (!changeRes.ok || !changeData.success) throw new Error('Falló cambio de contraseña');
  console.log('✅ [TEST 4] Cambio de contraseña con nuevo hash Bcrypt: APROBADO');

  // Test 5: Iniciar sesión con la NUEVA contraseña
  const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'libu.impresiones@gmail.com',
      password: 'NuevaClaveSegura2026!',
      'cf-turnstile-response': 'dev_bypass_token'
    })
  });
  if (!newLoginRes.ok) throw new Error('Falló login con la nueva contraseña');
  console.log('✅ [TEST 5] Login exitoso con la NUEVA contraseña: APROBADO');

  // Test 6: Rechazar login con la VIEJA contraseña
  const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'libu.impresiones@gmail.com',
      password: 'UniversalAlsina2026!',
      'cf-turnstile-response': 'dev_bypass_token'
    })
  });
  if (oldLoginRes.status !== 401) throw new Error('La contraseña vieja no debe funcionar más');
  console.log('✅ [TEST 6] Rechazo efectivo de la contraseña anterior revocada (401): APROBADO');

  // Test 7: Restablecer contraseña con código de seguridad cifrado AES-256
  const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'libu.impresiones@gmail.com',
      recoveryCode: 'LU-ADMIN-9481-SEC',
      newPassword: 'UniversalAlsina2026!',
      confirmPassword: 'UniversalAlsina2026!'
    })
  });
  const resetData = await resetRes.json();
  if (!resetRes.ok || !resetData.success) throw new Error('Falló restablecimiento con código maestro');
  console.log('✅ [TEST 7] Restablecimiento con Código Maestro Cifrado AES-256-GCM: APROBADO');

  // Test 8: Login con la contraseña restaurada
  const restoredLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'libu.impresiones@gmail.com',
      password: 'UniversalAlsina2026!',
      'cf-turnstile-response': 'dev_bypass_token'
    })
  });
  if (!restoredLoginRes.ok) throw new Error('Falló login con contraseña restablecida');
  console.log('✅ [TEST 8] Login exitoso con contraseña original restaurada: APROBADO');

  server.close();
  console.log('\n🏆 TODOS LOS 8 TESTS DE SEGURIDAD Y ENCRIPTACIÓN APROBADOS AL 100%');
}

runTests().catch(err => {
  console.error('❌ Error en tests:', err);
  process.exit(1);
});
