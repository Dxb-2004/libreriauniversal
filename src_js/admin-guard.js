/**
 * Librería Universal - Route Guard de Administración
 * Valida la existencia e integridad del token criptográfico antes de permitir renderizado.
 * Cero scripts inline para cumplir con Content-Security-Policy (CSP).
 */
(async function routeGuard() {
  'use strict';
  try {
    let token = null;
    if (typeof window !== 'undefined' && window.CryptoStorage) {
      token = await window.CryptoStorage.getItem('lu_admin_token', true) || 
              await window.CryptoStorage.getItem('lu_admin_token', false);
    } else if (typeof window !== 'undefined') {
      token = window.sessionStorage?.getItem('lu_admin_token') || 
              window.localStorage?.getItem('lu_admin_token');
    }

    if (!token) {
      window.location.replace('login.html');
    }
  } catch (err) {
    window.location.replace('login.html');
  }
})();
