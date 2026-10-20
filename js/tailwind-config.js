/**
 * Librería Universal - Configuración Unificada de Tailwind CSS
 * Permite eliminar scripts inline del HTML para cumplir con Content-Security-Policy (CSP)
 * sin requerir 'unsafe-inline'.
 */
(function() {
  'use strict';
  if (typeof window !== 'undefined' && typeof window.tailwind !== 'undefined') {
    window.tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              cyan: '#00A3E0',
              magenta: '#E5007D',
              yellow: '#FFD100',
              purple: '#7C3AED',
              whatsapp: '#159A5C',
              dark: '#0B0F19',
              card: '#111827',
              border: '#1F2937'
            }
          },
          fontFamily: {
            sans: ['Poppins', 'Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
            display: ['DM Serif Display', 'Playfair Display', 'Poppins', 'serif'],
            serif: ['DM Serif Display', 'Playfair Display', 'serif'],
            body: ['Inter', 'Poppins', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
            script: ['Dancing Script', 'cursive'],
            impact: ['Oswald', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    };
  }
})();
