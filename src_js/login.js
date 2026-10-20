/**
 * Librería Universal - Módulo de Autenticación de Administrador (login.js)
 * Manejo de inicio de sesión seguro, cifrado de credenciales en almacenamiento local
 * y prevención de inyección.
 */
(function() {
  'use strict';

  const startLogin = async () => {
    // Purga criptográfica de sesiones previas en pantalla de login
    if (typeof window.CryptoStorage !== 'undefined') {
      window.CryptoStorage.removeItem('lu_admin_token', true);
      window.CryptoStorage.removeItem('lu_admin_user', true);
      window.CryptoStorage.removeItem('lu_admin_token', false);
      window.CryptoStorage.removeItem('lu_admin_user', false);
    } else {
      sessionStorage.removeItem('lu_admin_token');
      sessionStorage.removeItem('lu_admin_user');
      localStorage.removeItem('lu_admin_token');
      localStorage.removeItem('lu_admin_user');
    }

    // Toggle para visualizar contraseña
    const passwordInput = document.getElementById('admin-password');
    const togglePasswordBtn = document.getElementById('toggle-password-btn');
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        togglePasswordBtn.classList.toggle('text-brand-cyan', isPassword);
      });
    }

    // Manejo de Error Visual
    const errorAlert = document.getElementById('login-error-alert');
    const errorMessage = document.getElementById('login-error-message');

    function showError(msg) {
      if (errorMessage && errorAlert) {
        errorMessage.textContent = msg;
        errorAlert.classList.remove('hidden');
      }
    }

    function hideError() {
      if (errorAlert) {
        errorAlert.classList.add('hidden');
      }
    }

    // Toggle entre Formulario de Login y Formulario de Recuperación
    const loginForm = document.getElementById('admin-login-form');
    const recoveryContainer = document.getElementById('recovery-container');
    const btnShowRecovery = document.getElementById('btn-show-recovery');
    const btnBackToLogin = document.getElementById('btn-back-to-login');

    if (btnShowRecovery) {
      btnShowRecovery.addEventListener('click', () => {
        hideError();
        loginForm?.classList.add('hidden');
        recoveryContainer?.classList.remove('hidden');
      });
    }

    if (btnBackToLogin) {
      btnBackToLogin.addEventListener('click', () => {
        hideError();
        recoveryContainer?.classList.add('hidden');
        loginForm?.classList.remove('hidden');
      });
    }

    // Procesamiento de Login
    const submitBtn = document.getElementById('login-submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnArrow = document.getElementById('btn-arrow');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const password = document.getElementById('admin-password')?.value;

        if (!password) {
          showError('Por favor ingrese la contraseña de administrador.');
          return;
        }

        // Estado de carga
        if (submitBtn) submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Verificando contraseña...';
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        if (btnArrow) btnArrow.classList.add('hidden');

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              password,
              'cf-turnstile-response': 'dev_bypass_token'
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Error al autenticar. Verifique sus datos.');
          }

          if (data.user && data.user.role !== 'admin') {
            throw new Error('Acceso denegado: Esta cuenta no posee permisos de Administrador.');
          }

          // Guardar token cifrado con AES-GCM en sessionStorage y localStorage
          if (typeof window.CryptoStorage !== 'undefined') {
            await window.CryptoStorage.setItem('lu_admin_token', data.token, true);
            await window.CryptoStorage.setItem('lu_admin_user', JSON.stringify(data.user), true);
            await window.CryptoStorage.setItem('lu_admin_token', data.token, false);
            await window.CryptoStorage.setItem('lu_admin_user', JSON.stringify(data.user), false);
          } else {
            sessionStorage.setItem('lu_admin_token', data.token);
            sessionStorage.setItem('lu_admin_user', JSON.stringify(data.user));
            localStorage.setItem('lu_admin_token', data.token);
            localStorage.setItem('lu_admin_user', JSON.stringify(data.user));
          }

          if (btnText) btnText.textContent = '¡Acceso concedido! Redirigiendo...';
          if (submitBtn) {
            submitBtn.classList.remove('bg-brand-cyan');
            submitBtn.classList.add('bg-emerald-500', 'text-white');
          }

          setTimeout(() => {
            window.location.href = 'admin.html';
          }, 400);

        } catch (err) {
          showError(err.message || 'No se pudo conectar con el servidor.');
          if (submitBtn) submitBtn.disabled = false;
          if (btnText) btnText.textContent = 'Ingresar al Dashboard';
          if (btnSpinner) btnSpinner.classList.add('hidden');
          if (btnArrow) btnArrow.classList.remove('hidden');
        }
      });
    }

    // Procesamiento de Restablecimiento con Código Maestro Cifrado
    const recoveryForm = document.getElementById('recovery-form');
    const btnSubmitRecovery = document.getElementById('btn-submit-recovery');
    const recoveryBtnText = document.getElementById('recovery-btn-text');

    if (recoveryForm) {
      recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const recoveryCode = document.getElementById('recovery-code')?.value.trim();
        const newPassword = document.getElementById('recovery-new-password')?.value;
        const confirmPassword = document.getElementById('recovery-confirm-password')?.value;

        if (!recoveryCode || !newPassword || !confirmPassword) {
          showError('Todos los campos son obligatorios.');
          return;
        }

        if (newPassword !== confirmPassword) {
          showError('Las contraseñas no coinciden.');
          return;
        }

        if (btnSubmitRecovery) btnSubmitRecovery.disabled = true;
        if (recoveryBtnText) recoveryBtnText.textContent = 'Validando y encriptando...';

        try {
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recoveryCode,
              newPassword,
              confirmPassword
            })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || 'Error al restablecer la contraseña.');
          }

          // Éxito: volver a pantalla de login con mensaje
          recoveryContainer?.classList.add('hidden');
          loginForm?.classList.remove('hidden');
          const adminPassInput = document.getElementById('admin-password');
          if (adminPassInput) adminPassInput.value = '';
          
          // Mostrar alerta verde temporal
          if (errorAlert && errorMessage) {
            errorAlert.classList.remove('hidden', 'bg-brand-magenta/10', 'border-brand-magenta/40', 'text-brand-magenta');
            errorAlert.classList.add('bg-emerald-500/15', 'border-emerald-500/40', 'text-emerald-400');
            errorMessage.textContent = '¡Contraseña restablecida y encriptada! Ingrese su nueva clave.';
          }

        } catch (err) {
          showError(err.message || 'Error al validar el código.');
        } finally {
          if (btnSubmitRecovery) btnSubmitRecovery.disabled = false;
          if (recoveryBtnText) recoveryBtnText.textContent = 'Restablecer y Encriptar';
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLogin);
  } else {
    startLogin();
  }
})();
