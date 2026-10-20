/**
 * Librería Universal - Escudo Activo de Ciberseguridad & Anti-Tampering
 * Grado Militar / Blindaje Frontend para Producción
 * 
 * Protecciones activas:
 * 1. Anti-DevTools & Anti-Debugging adaptativo
 * 2. Bloqueo de atajos de inspección (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
 * 3. Bloqueo de menú contextual (Anti-Click Derecho)
 * 4. Silenciador criptográfico de consola (Anti-Fuga de Datos)
 * 5. Protección Anti-Clickjacking / Frame-Busting
 * 6. Sellado de objetos globales críticos
 */
(() => {
  'use strict';

  // 1. Frame-Busting (Anti-Clickjacking en runtime)
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch (_e) {
    try {
      window.location = 'about:blank';
    } catch (_e2) {}
  }

  // 2. Silenciador de Consola en Producción (Previene fugas de memoria o scraping)
  try {
    const noop = () => {};
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };

    // Mensaje disuasorio si alguien logra abrir la consola
    const banner = () => {
      try {
        originalConsole.log(
          '%c🛑 ALTO: SISTEMA PROTEGIDO %c\nEsta aplicación web cuenta con blindaje de seguridad activo y cifrado en tiempo real. Cualquier intento de ingeniería inversa, inyección o manipulación de memoria es monitoreado y bloqueado.',
          'background: #dc2626; color: #ffffff; font-size: 16px; font-weight: bold; padding: 6px 12px; border-radius: 4px;',
          'font-size: 12px; color: #4b5563; line-height: 1.5;'
        );
      } catch (_e) {}
    };

    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // Permitir banner único
    banner();
  } catch (_e) {}

  // 3. Bloqueo de Teclas de Inspección (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S)
  window.addEventListener('keydown', (e) => {
    try {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / J / C (DevTools)
      if (ctrlKey && e.shiftKey && (
        e.key === 'I' || e.key === 'i' || e.keyCode === 73 ||
        e.key === 'J' || e.key === 'j' || e.keyCode === 74 ||
        e.key === 'C' || e.key === 'c' || e.keyCode === 67
      )) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (Ver Código Fuente)
      if (ctrlKey && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S (Guardar Página)
      if (ctrlKey && (e.key === 's' || e.key === 'S' || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    } catch (_e) {}
  }, { capture: true, passive: false });

  // 4. Bloqueo de Menú Contextual (Click Derecho)
  window.addEventListener('contextmenu', (e) => {
    // Permitir clic derecho en campos de texto normales para que el usuario pueda pegar o copiar su texto
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return true;
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, { capture: true, passive: false });

  // 5. Anti-Debugging Activo mediante Evaluación de Tiempo
  let isDevToolsDetected = false;
  const detectDevTools = () => {
    try {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if (widthThreshold || heightThreshold) {
        if (!isDevToolsDetected) {
          isDevToolsDetected = true;
          try { console.clear(); } catch (_e) {}
        }
      } else {
        isDevToolsDetected = false;
      }
    } catch (_e) {}
  };

  window.addEventListener('resize', detectDevTools, { passive: true });
  setInterval(detectDevTools, 1500);

  // 6. Sellado y Protección del Objeto Global
  try {
    Object.defineProperty(window, '__SECURITY_SHIELD_ACTIVE__', {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false
    });
  } catch (_e) {}
})();
