/**
 * Librería Universal - Gráfica, Imprenta y Librería Integral
 * Lógica Interactiva con Blindaje Criptográfico de Grado Militar (Zero Global Scope)
 */
(() => {
  'use strict';

  function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    const props = Object.keys(obj);
    for (let i = 0; i < props.length; i++) {
      const val = obj[props[i]];
      if (typeof val === 'object' && val !== null && !Object.isFrozen(val)) {
        deepFreeze(val);
      }
    }
    return obj;
  }

  // Sanitizador de texto estricto contra vectores XSS y caracteres de control
  function sanitizeInputText(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/(javascript|vbscript|data):/gi, '')
      .trim();
  }

  // Generador seguro de URLs de WhatsApp con validación estricta de protocolo https:
  function createSafeWhatsAppUrl(phone, text) {
    const cleanPhone = String(phone).replace(/[^\d]/g, '');
    const encodedText = encodeURIComponent(String(text || ''));
    const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && (parsed.hostname === 'wa.me' || parsed.hostname === 'api.whatsapp.com')) {
        return url;
      }
    } catch (e) {
      // Fallback
    }
    return `https://wa.me/${cleanPhone}`;
  }

// Utilidad criptográfica y de escape Anti-XSS (Punto 15)
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}


// Configuración oficial del negocio (Datos reales verificados)
const BUSINESS_CONFIG = deepFreeze({
  name: "Librería Universal",
  whatsappNumber: "5491126097125",
  phoneDisplay: "+54 9 11 2609-7125",
  address: "Av. Pte. Tte. Gral. J. D. Perón 3502, Valentín Alsina",
  email: "libu.impresiones@gmail.com",
  schedule: "Turno mañana: 9:30 a 13:15 hs | Turno tarde: 16:00 a 19:30 hs",
  notice: "¡Importante! No recibimos llamadas, únicamente mensajes de WhatsApp."
});

// Estado global del Diseñador de Sellos (Sello Personalizado)
const stampState = {
  // Configuración de Sello Personalizado
  apparatusType: 'automatico', // 'automatico' | 'madera'
  orientation: 'horizontal',   // 'horizontal' | 'vertical'
  lineCount: 3,
  lines: [
    "DR. MARTÍN G. HERRERA",
    "MÉDICO CLÍNICO - M.N. 128.450",
    "ESPECIALISTA EN MEDICINA INTERNA",
    ""
  ],
  lineFonts: [
    'font-stamp-01',
    'font-stamp-01',
    'font-stamp-01',
    'font-stamp-01'
  ],
  lineBolds: [true, false, false, false],
  lineItalics: [false, false, false, false],
  sameFontForAll: false,
  fontFamily: 'font-stamp-01', // 'font-stamp-01' a 'font-stamp-23'
  alignment: 'center',          // 'left' | 'center' | 'right'
  inkColor: '#111827',          // '#111827' (Negro), '#1e40af' (Azul), '#dc2626' (Rojo), '#6d28d9' (Violeta)
  borderStyle: 'dashed',        // 'dashed' | 'solid' | 'rounded' | 'none'
  drawingPosition: 'none',      // 'none' | 'left' | 'right'
  selectedDrawing: null,        // Objeto de STAMP_DRAWINGS_1_TO_168
  // Modal Lightbox
  modalTab: 'drawings',
  modalSearchQuery: ''
};

// Catálogo de productos de librería organizado por categorías
const stationeryProducts = [];
// Inicialización cuando el DOM esté listo
const startApp = () => {
  initMobileMenu();
  initStampDesigner();
  initWhatsAppFloating();
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

/* ==========================================================================
   1. DISEÑADOR INTERACTIVO DE SELLOS (SELLO PERSONALIZADO)
   ========================================================================== */
function initStampDesigner() {
  renderLineInputs();
  bindPersonalizedControls();
  initDrawingsSelector();
  initCatalogModal();
  updateStampPreview();
  updateStampSummary();
}

// ─── Controles & Líneas del Sello Personalizado ───
function renderLineInputs() {
  const container = document.getElementById('stamp-lines-inputs');
  if (!container) return;

  container.innerHTML = '';

  const placeholders = [
    "Ej: DR. JUAN CARLOS PÉREZ",
    "Ej: MÉDICO CLÍNICO - M.N. 128.450",
    "Ej: ESPECIALISTA EN MEDICINA INTERNA",
    "Ej: Tel: (011) 2609-7125 | Valentín Alsina"
  ];

  const labels = [
    "Línea 1 (Principal):",
    "Línea 2 (Profesión / Cargo):",
    "Línea 3 (Matrícula / CUIT):",
    "Línea 4 (Contacto / Teléfono):"
  ];

  for (let i = 0; i < stampState.lineCount; i++) {
    const currentText = stampState.lines[i] || '';
    const currentFont = stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01';
    const isBold = !!stampState.lineBolds[i];
    const isItalic = !!stampState.lineItalics[i];

    const card = document.createElement('div');
    card.className = 'p-3 sm:p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 transition-all hover:border-slate-700 shadow-sm';

    // Cabecera de la línea con label y botones rápidos [B] e [I]
    const headerRow = document.createElement('div');
    headerRow.className = 'flex items-center justify-between';

    const label = document.createElement('label');
    label.className = 'text-xs font-bold text-slate-300 flex items-center gap-2';
    label.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400"></span> ${labels[i] || `Línea ${i + 1}:`}`;

    const styleBtns = document.createElement('div');
    styleBtns.className = 'flex items-center gap-1.5';

    // Botón [B] (Negrita)
    const boldBtn = document.createElement('button');
    boldBtn.type = 'button';
    boldBtn.title = 'Alternar Negrita para esta línea';
    boldBtn.className = isBold
      ? 'w-7 h-7 rounded-lg text-xs font-black bg-cyan-600 text-white shadow-sm transition'
      : 'w-7 h-7 rounded-lg text-xs font-bold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition';
    boldBtn.textContent = 'B';
    boldBtn.addEventListener('click', () => {
      stampState.lineBolds[i] = !stampState.lineBolds[i];
      renderLineInputs();
      updateStampPreview();
    });

    // Botón [I] (Itálica)
    const italicBtn = document.createElement('button');
    italicBtn.type = 'button';
    italicBtn.title = 'Alternar Itálica para esta línea';
    italicBtn.className = isItalic
      ? 'w-7 h-7 rounded-lg text-xs font-serif italic font-black bg-cyan-600 text-white shadow-sm transition'
      : 'w-7 h-7 rounded-lg text-xs font-serif italic font-bold bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition';
    italicBtn.textContent = 'I';
    italicBtn.addEventListener('click', () => {
      stampState.lineItalics[i] = !stampState.lineItalics[i];
      renderLineInputs();
      updateStampPreview();
    });

    styleBtns.appendChild(boldBtn);
    styleBtns.appendChild(italicBtn);
    headerRow.appendChild(label);
    headerRow.appendChild(styleBtns);
    card.appendChild(headerRow);

    // Fila principal: Input de texto (65%) + Selector de tipografía (35%)
    const mainRow = document.createElement('div');
    mainRow.className = 'grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-2.5 items-center';

    // Input de texto (col-span-7 o 8)
    const inputCol = document.createElement('div');
    inputCol.className = 'sm:col-span-7 lg:col-span-8';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    input.placeholder = placeholders[i] || `Texto de la línea ${i + 1}`;
    input.maxLength = 40;
    input.className = 'w-full px-3 py-2 text-sm bg-slate-950 text-white border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition shadow-inner outline-none font-medium placeholder-slate-500';

    input.addEventListener('input', (e) => {
      stampState.lines[i] = e.target.value;
      updateLineValidations(i, card);
      updateStampPreview();
      updateStampSummary();
    });

    inputCol.appendChild(input);
    mainRow.appendChild(inputCol);

    // Selector de tipografía (col-span-5 o 4)
    const selectCol = document.createElement('div');
    selectCol.className = 'sm:col-span-5 lg:col-span-4';

    const select = document.createElement('select');
    select.className = 'w-full px-2.5 py-2 text-xs bg-slate-950 text-slate-200 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-medium cursor-pointer';

    const optgroups = [
      { label: '─── ESTÁNDAR (01 a 11) ───', items: STAMP_FONTS_CATALOG.filter(f => f.group.startsWith('Estándar')) },
      { label: '─── SOLO MAYÚSCULAS (12 a 16) ───', items: STAMP_FONTS_CATALOG.filter(f => f.group.startsWith('Solo Mayúsculas')) },
      { label: '─── CURSIVAS (17 a 23) ───', items: STAMP_FONTS_CATALOG.filter(f => f.group.startsWith('Cursivas')) }
    ];

    optgroups.forEach(og => {
      const optgroupEl = document.createElement('optgroup');
      optgroupEl.label = og.label;
      og.items.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.short;
        if (f.id === currentFont) option.selected = true;
        optgroupEl.appendChild(option);
      });
      select.appendChild(optgroupEl);
    });

    select.addEventListener('change', (e) => {
      const newFont = e.target.value;
      if (stampState.sameFontForAll) {
        stampState.fontFamily = newFont;
        for (let j = 0; j < 4; j++) {
          stampState.lineFonts[j] = newFont;
        }
        renderLineInputs();
      } else {
        stampState.lineFonts[i] = newFont;
        updateLineValidations(i, card);
      }

      // Sincronizar selector maestro de Paso 3
      const masterSelect = document.getElementById('stamp-font-select');
      if (masterSelect) masterSelect.value = newFont;

      updateStampPreview();
      updateStampSummary();
    });

    selectCol.appendChild(select);
    mainRow.appendChild(selectCol);
    card.appendChild(mainRow);

    // Contenedor de validaciones específicas para esta línea
    const alertsBox = document.createElement('div');
    alertsBox.id = `line-alerts-${i}`;
    alertsBox.className = 'pt-0.5 space-y-1';
    card.appendChild(alertsBox);

    container.appendChild(card);
    updateLineValidations(i, card);
  }
}

// ─── Validaciones Individuales por Línea ───
function updateLineValidations(i, card) {
  const alertsBox = card ? card.querySelector(`#line-alerts-${i}`) : document.getElementById(`line-alerts-${i}`);
  if (!alertsBox) return;

  const fontId = stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01';
  const text = (stampState.lines[i] || '').trim();
  const fontMeta = getFontMeta(fontId);

  let alertsHtml = '';

  // 1. Regla "Solo Mayúsculas" (Fuentes 12 a 16)
  if (fontMeta.uppercase) {
    alertsHtml += `
      <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/70 text-purple-300 border border-purple-800 text-[10px] font-bold">
        <span>🔤</span>
        <span>Línea en MAYÚSCULAS</span>
      </div>
    `;
  }

  // 2. Regla "Sin Números" (Fuentes 09 - Rickety y 23 - Birds of Paradise)
  if (fontMeta.noNumbers && /\d/.test(text)) {
    alertsHtml += `
      <div class="flex items-center gap-1.5 text-[11px] text-red-400 font-semibold bg-red-950/60 border border-red-800/80 px-2 py-1 rounded-md">
        <span>⚠️</span>
        <span>Esta fuente no admite números (escribí los números en otra línea o cambiá de tipografía).</span>
      </div>
    `;
  }

  // 3. Advertencia de Tildes/Caracteres Especiales (Fuentes 13, 14, 16, 20, 23)
  if (fontMeta.specialNotice) {
    alertsHtml += `
      <div class="flex items-center gap-1.5 text-[10px] text-amber-300/90 font-medium">
        <span>ℹ️</span>
        <span>Esta fuente de autor puede no incluir tildes o caracteres especiales.</span>
      </div>
    `;
  }

  alertsBox.innerHTML = alertsHtml;
}

function bindPersonalizedControls() {
  // Selector de Orientación (Horizontal / Vertical)
  function setStampOrientation(newOrient) {
    stampState.orientation = newOrient;

    // Botones de formulario en Paso 1
    document.querySelectorAll('[data-orientation]').forEach(btn => {
      const isThis = btn.getAttribute('data-orientation') === newOrient;
      if (isThis) {
        btn.classList.remove('border-[#1F2937]', 'bg-[#0B0F19]', 'text-slate-400');
        btn.classList.add('border-brand-cyan', 'bg-brand-cyan/10', 'text-white');
      } else {
        btn.classList.remove('border-brand-cyan', 'bg-brand-cyan/10', 'text-white');
        btn.classList.add('border-[#1F2937]', 'bg-[#0B0F19]', 'text-slate-400');
      }
    });

    // Botones rápidos de vista previa en tarjetas 1 y 2
    document.querySelectorAll('[data-preview-orient]').forEach(btn => {
      const isThis = btn.getAttribute('data-preview-orient') === newOrient;
      if (isThis) {
        btn.classList.remove('text-slate-400');
        btn.classList.add('bg-brand-cyan', 'text-[#0B0F19]');
      } else {
        btn.classList.remove('bg-brand-cyan', 'text-[#0B0F19]');
        btn.classList.add('text-slate-400');
      }
    });

    const orientLabel = document.getElementById('stamp-orientation-label');
    if (orientLabel) {
      orientLabel.textContent = newOrient === 'vertical' ? 'Vertical (18x47mm)' : 'Horizontal (47x18mm)';
    }

    updateStampPreview();
    updateStampSummary();
  }

  document.querySelectorAll('[data-orientation]').forEach(btn => {
    btn.addEventListener('click', () => {
      setStampOrientation(btn.getAttribute('data-orientation'));
    });
  });

  document.querySelectorAll('[data-preview-orient]').forEach(btn => {
    btn.addEventListener('click', () => {
      setStampOrientation(btn.getAttribute('data-preview-orient'));
    });
  });

  // Selector de Tipo de Aparato (Personalizado)
  const apparatusCards = document.querySelectorAll('[data-apparatus]');
  apparatusCards.forEach(card => {
    card.addEventListener('click', () => {
      apparatusCards.forEach(c => {
        c.classList.remove('border-cyan-500', 'bg-cyan-950/40', 'ring-2', 'ring-cyan-500/30');
        c.classList.add('border-slate-700', 'bg-slate-900/60');
        const radio = c.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
      });

      card.classList.remove('border-slate-700', 'bg-slate-900/60');
      card.classList.add('border-cyan-500', 'bg-cyan-950/40', 'ring-2', 'ring-cyan-500/30');
      const currentRadio = card.querySelector('input[type="radio"]');
      if (currentRadio) currentRadio.checked = true;

      stampState.apparatusType = card.getAttribute('data-apparatus');
      updateStampSummary();
      updateStampPreview();
    });
  });

  // Selector de Cantidad de Líneas (1, 2, 3, 4)
  const lineCountBtns = document.querySelectorAll('[data-lines]');
  lineCountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      lineCountBtns.forEach(b => {
        b.classList.remove('bg-cyan-600', 'text-white', 'shadow-md', 'shadow-cyan-600/30');
        b.classList.add('bg-slate-800', 'text-slate-300', 'hover:bg-slate-700');
      });

      btn.classList.remove('bg-slate-800', 'text-slate-300', 'hover:bg-slate-700');
      btn.classList.add('bg-cyan-600', 'text-white', 'shadow-md', 'shadow-cyan-600/30');

      const count = parseInt(btn.getAttribute('data-lines'), 10);
      stampState.lineCount = count;
      renderLineInputs();
      updateStampSummary();
      updateStampPreview();
    });
  });

  // Switch de "Misma tipografía en todas las líneas"
  const syncToggle = document.getElementById('stamp-sync-font-toggle');
  if (syncToggle) {
    syncToggle.addEventListener('change', (e) => {
      stampState.sameFontForAll = e.target.checked;
      if (stampState.sameFontForAll) {
        const masterFont = stampState.lineFonts[0] || stampState.fontFamily || 'font-stamp-01';
        stampState.fontFamily = masterFont;
        for (let j = 0; j < 4; j++) {
          stampState.lineFonts[j] = masterFont;
        }
        renderLineInputs();
        updateStampPreview();
        updateStampSummary();
        showToast("Misma tipografía activada para todas las líneas.");
      } else {
        showToast("Tipografía independiente habilitada por línea.");
      }
    });
  }

  // Botón "Aplicar fuente de Línea 1 a todas"
  const applyLine1Btn = document.getElementById('btn-apply-line1-font');
  if (applyLine1Btn) {
    applyLine1Btn.addEventListener('click', () => {
      const f1 = stampState.lineFonts[0] || 'font-stamp-01';
      stampState.fontFamily = f1;
      for (let j = 0; j < 4; j++) {
        stampState.lineFonts[j] = f1;
      }
      stampState.sameFontForAll = true;
      if (syncToggle) syncToggle.checked = true;

      const masterSelect = document.getElementById('stamp-font-select');
      if (masterSelect) masterSelect.value = f1;

      renderLineInputs();
      updateStampPreview();
      updateStampSummary();
      showToast(`Fuente ${getFontShortName(f1)} aplicada a todas las líneas.`);
    });
  }

  // Selector de Tipografía Maestro (Paso 3)
  const fontSelect = document.getElementById('stamp-font-select');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      const chosen = e.target.value;
      stampState.fontFamily = chosen;
      if (stampState.sameFontForAll) {
        for (let j = 0; j < 4; j++) {
          stampState.lineFonts[j] = chosen;
        }
      } else {
        stampState.lineFonts[0] = chosen;
      }
      renderLineInputs();
      updateStampPreview();
      updateStampSummary();
    });
  }

  // Selector de Alineación (Izquierda / Centro / Derecha)
  const alignBtns = document.querySelectorAll('[data-align]');
  alignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      alignBtns.forEach(b => {
        b.classList.remove('bg-cyan-600', 'text-white');
        b.classList.add('bg-slate-900', 'text-slate-400');
      });
      btn.classList.remove('bg-slate-900', 'text-slate-400');
      btn.classList.add('bg-cyan-600', 'text-white');

      stampState.alignment = btn.getAttribute('data-align');
      updateStampPreview();
      updateStampSummary();
    });
  });

  // Selector de Color de Tinta
  const inkBtns = document.querySelectorAll('[data-ink-color]');
  inkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      inkBtns.forEach(b => b.classList.remove('ring-4', 'ring-offset-2', 'ring-cyan-500', 'ring-offset-slate-900'));
      btn.classList.add('ring-4', 'ring-offset-2', 'ring-cyan-500', 'ring-offset-slate-900');

      stampState.inkColor = btn.getAttribute('data-ink-color');
      updateStampPreview();
      updateStampSummary();
    });
  });

  // Selector de Estilo de Marco / Borde
  const borderSelect = document.getElementById('stamp-border-select');
  if (borderSelect) {
    borderSelect.addEventListener('change', (e) => {
      stampState.borderStyle = e.target.value;
      updateStampPreview();
      updateStampSummary();
    });
  }

  // Botones Solicitar Presupuesto por WhatsApp (en ambas tarjetas de vista previa)
  ['btn-whatsapp-stamp-order', 'btn-whatsapp-stamp-order-2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', handleWhatsAppOrder);
    }
  });

  // Botones Agregar Sello al Carrito de Compras Unificado
  ['btn-add-stamp-cart', 'btn-add-stamp-cart-2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', handleAddStampToCart);
    }
  });

  // Botón Copiar Configuración al Portapapeles
  const btnCopyDetails = document.getElementById('btn-copy-stamp-details');
  if (btnCopyDetails) {
    btnCopyDetails.addEventListener('click', handleCopyDetails);
  }


}

// ─── Selector de Dibujos 1 al 168 (Modo Personalizado) ───
function initDrawingsSelector() {
  const posBtns = document.querySelectorAll('[data-drawing-pos]');
  const catBtns = document.querySelectorAll('[data-drawing-cat]');
  const searchInput = document.getElementById('stamp-drawing-search');
  const counterEl = document.getElementById('drawing-results-counter');

  // Posición del Dibujo
  posBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      posBtns.forEach(b => {
        b.className = 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition';
      });
      btn.className = 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-cyan-500 bg-cyan-950 text-cyan-200 transition';

      stampState.drawingPosition = btn.getAttribute('data-drawing-pos');
      if (stampState.drawingPosition !== 'none' && !stampState.selectedDrawing && typeof STAMP_DRAWINGS_1_TO_168 !== 'undefined') {
        stampState.selectedDrawing = STAMP_DRAWINGS_1_TO_168[23] || STAMP_DRAWINGS_1_TO_168[0]; // #24 AFA por defecto
      }
      renderDrawingsGrid();
      updateStampPreview();
      updateStampSummary();
    });
  });

  // Botón Quitar Dibujo desde el banner
  const btnRemove = document.getElementById('btn-remove-selected-drawing');
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      stampState.drawingPosition = 'none';
      posBtns.forEach(b => {
        const isNone = b.getAttribute('data-drawing-pos') === 'none';
        b.className = isNone
          ? 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-cyan-500 bg-cyan-950 text-cyan-200 transition'
          : 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition';
      });
      renderDrawingsGrid();
      updateStampPreview();
      updateStampSummary();
      showToast('Dibujo quitado del sello.');
    });
  }

  // Filtro de Categoría de Dibujos
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => {
        b.className = 'drawing-cat-btn px-2.5 py-1 rounded-lg font-semibold bg-slate-950 text-slate-400 hover:text-white whitespace-nowrap';
      });
      btn.className = 'drawing-cat-btn px-2.5 py-1 rounded-lg font-semibold bg-cyan-600 text-white whitespace-nowrap';

      const cat = btn.getAttribute('data-drawing-cat');
      renderDrawingsGrid(cat, searchInput ? searchInput.value : '');
    });
  });

  // Buscador de Dibujos
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const activeCatBtn = document.querySelector('[data-drawing-cat].bg-cyan-600');
      const cat = activeCatBtn ? activeCatBtn.getAttribute('data-drawing-cat') : 'todos';
      renderDrawingsGrid(cat, e.target.value);
    });
  }

  renderDrawingsGrid();
}

function updateDrawingBanner() {
  const banner = document.getElementById('selected-drawing-banner');
  const thumb = document.getElementById('selected-drawing-thumb');
  const codeEl = document.getElementById('selected-drawing-code');
  const titleEl = document.getElementById('selected-drawing-title');
  const posTextEl = document.getElementById('selected-drawing-pos-text');

  if (!banner) return;

  if (stampState.drawingPosition !== 'none' && stampState.selectedDrawing) {
    banner.classList.remove('hidden');
    banner.classList.add('flex');
    if (thumb) {
      thumb.src = stampState.selectedDrawing.image;
      thumb.alt = stampState.selectedDrawing.name;
    }
    if (codeEl) codeEl.textContent = `#${stampState.selectedDrawing.code}`;
    if (titleEl) titleEl.textContent = stampState.selectedDrawing.name;
    if (posTextEl) {
      posTextEl.textContent = `Ubicación: ${stampState.drawingPosition === 'left' ? 'A la Izquierda' : 'A la Derecha'}`;
    }
  } else {
    banner.classList.add('hidden');
    banner.classList.remove('flex');
  }
}

function renderDrawingsGrid(category = 'todos', search = '') {
  const grid = document.getElementById('stamp-drawings-grid');
  const counterEl = document.getElementById('drawing-results-counter');
  if (!grid || typeof STAMP_DRAWINGS_1_TO_168 === 'undefined') return;

  const q = search.toLowerCase().trim();
  const filtered = STAMP_DRAWINGS_1_TO_168.filter(item => {
    const matchCat = (category === 'todos' || item.category === category);
    const matchSearch = (!q || item.code.includes(q) || item.name.toLowerCase().includes(q) || (item.catName && item.catName.toLowerCase().includes(q)));
    return matchCat && matchSearch;
  });

  if (counterEl) {
    counterEl.textContent = `${filtered.length} dibujo${filtered.length !== 1 ? 's' : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full py-6 text-center text-xs text-slate-500">No encontramos dibujos con esa búsqueda.</div>';
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const isSelected = stampState.selectedDrawing && stampState.selectedDrawing.code === item.code;
    const borderClass = isSelected 
      ? 'border-2 border-cyan-400 bg-cyan-950/80 text-white ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950' 
      : 'border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white';

    return `
      <button type="button" data-select-drawing="${item.code}" 
              class="p-2 rounded-xl text-center transition flex flex-col items-center justify-between gap-1 group ${borderClass}">
        <span class="text-xs font-mono font-bold text-cyan-400">#${item.code}</span>
        <div class="w-14 h-14 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm my-0.5 group-hover:scale-105 transition-transform">
          <img src="${item.image}" alt="${item.name}" class="max-w-full max-h-full object-contain filter contrast-125" loading="lazy" />
        </div>
        <span class="text-[10px] font-medium leading-tight truncate w-full text-slate-300 group-hover:text-cyan-200">${item.name}</span>
      </button>
    `;
  }).join('');

  // Vincular clics de selección de dibujo
  grid.querySelectorAll('[data-select-drawing]').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-select-drawing');
      const found = STAMP_DRAWINGS_1_TO_168.find(d => d.code === code);
      if (found) {
        stampState.selectedDrawing = found;
        if (stampState.drawingPosition === 'none') {
          stampState.drawingPosition = 'left';
          // Actualizar botón de posición visual
          const posBtns = document.querySelectorAll('[data-drawing-pos]');
          posBtns.forEach(b => {
            const isLeft = b.getAttribute('data-drawing-pos') === 'left';
            b.className = isLeft
              ? 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-cyan-500 bg-cyan-950 text-cyan-200 transition'
              : 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition';
          });
        }
        renderDrawingsGrid(category, search);
        updateStampPreview();
        updateStampSummary();
        showToast(`Dibujo #${found.code} (${found.name}) seleccionado.`);
      }
    });
  });
}

// ─── Modal Lightbox (Explorador Visual de Catálogos) ───
function initCatalogModal() {
  const modal = document.getElementById('catalog-lightbox-modal');
  const openBtns = document.querySelectorAll('.btn-open-catalog-modal');
  const closeBtn = document.getElementById('btn-close-catalog-modal');
  const closeFooterBtn = document.getElementById('btn-modal-close-footer');
  const searchInput = document.getElementById('modal-search-input');
  const tabBtns = document.querySelectorAll('.modal-tab-btn');

  if (!modal) return;

  function openModal(defaultTab = 'drawings') {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    stampState.modalTab = defaultTab;
    stampState.modalSearchQuery = '';
    if (searchInput) searchInput.value = '';

    syncModalTabs();
    renderModalGrid();
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  openBtns.forEach(b => {
    b.addEventListener('click', () => {
      const targetTab = b.getAttribute('data-modal-open-tab') || 'drawings';
      openModal(targetTab);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stampState.modalTab = btn.getAttribute('data-modal-tab');
      syncModalTabs();
      renderModalGrid();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      stampState.modalSearchQuery = e.target.value;
      renderModalGrid();
    });
  }
}

function syncModalTabs() {
  // Solo catálogo de dibujos activo
  stampState.modalTab = 'drawings';
}

function renderTeacherPills() {
  const container = document.getElementById('modal-teacher-filters');
  if (!container) return;

  const totalCount = typeof TEACHER_STAMPS_DATA !== 'undefined' ? TEACHER_STAMPS_DATA.length : 290;

  const pills = [
    { id: 'todas', label: `Todos (${totalCount})` },
    { id: 'clasicos', label: '⭐ Clásicos 4x4 (1b a 31b bis)' },
    { id: 'catequesis', label: '✝️ Catequesis 4x4 (32b a 39b / cateq 1-6)' },
    { id: 'ingles', label: '🇬🇧 Inglés 4x4 (40b a 51b)' },
    { id: 'especiales', label: '📋 Especiales 5x3 y 6x4 (1E a 16E)' },
    { id: 'frases', label: '🔥 Frases y Virales 4x4 (1F a 21F)' },
    { id: 'mundial', label: '🏆 Mundial / Messi 4x4 (1M a 13M)' },
    { id: 'exceso', label: '🛑 Exceso de Corrección (1EC a 7EC)' },
    { id: 'efemerides', label: '🇦🇷 Días Festivos (1DF a 9DF)' },
    { id: 'intensamente', label: '🎭 Intensamente (1I a 6I)' },
    { id: 'memes', label: '😂 Memes 4x4 (Meme 1 a 21)' },
    { id: 'rectangulares', label: '📏 Rectangulares 4x2cm (1 al 103)' },
    { id: 'capybaras', label: '🐾 Capybaras y Stitch (Esp / Ing)' },
    { id: 'harrypotter', label: '⚡ Harry Potter 4x4 (HP 1 a HP 12)' }
  ];

  container.innerHTML = pills.map(p => {
    const isActive = (stampState.modalTeacherCollection || 'todas') === p.id;
    const cls = isActive
      ? 'px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 text-white shadow flex-shrink-0 transition cursor-pointer'
      : 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 flex-shrink-0 transition cursor-pointer';
    return `<button type="button" data-teacher-col="${p.id}" class="${cls}">${p.label}</button>`;
  }).join('');

  container.querySelectorAll('[data-teacher-col]').forEach(btn => {
    btn.addEventListener('click', () => {
      stampState.modalTeacherCollection = btn.getAttribute('data-teacher-col');
      renderTeacherPills();
      renderModalGrid();
    });
  });
}

function getCollectionShortLabel(col) {
  const map = {
    clasicos: 'Clásicos',
    catequesis: 'Catequesis',
    ingles: 'Inglés',
    especiales: 'Especiales',
    frases: 'Frases',
    mundial: 'Mundial',
    exceso: 'Exceso Corrección',
    efemerides: 'Días Festivos',
    intensamente: 'Intensamente',
    memes: 'Memes',
    rectangulares: 'Rectangulares',
    capybaras: 'Capybaras & Stitch',
    harrypotter: 'Harry Potter'
  };
  return map[col] || 'Catálogo CDC-8';
}

function renderTeacherStampVisual(item, color = '#111827', mode = 'thumb') {
  if (!item) return '';

  const isThumb = mode === 'thumb';
  const c = color || '#111827';
  const phrase = (item.phrase || '').trim();
  const icon = item.icon || '⭐';
  const code = item.code || '';
  const col = item.collection || '';
  const size = item.size || '4x4';

  // Imagen real extraída del PDF oficial de Catálogo Docente CDC-8
  const imageSrc = item.image || (code ? `img/cdc8/sello-${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}.png` : null);

  if (imageSrc) {
    if (isThumb) {
      return `
        <img src="${imageSrc}" alt="${phrase || code}"
             class="max-w-full max-h-full object-contain filter contrast-125 transition-transform"
             loading="lazy" />
      `;
    } else {
      let sizeClasses = 'max-w-[210px] max-h-[195px]';
      if (size === '4x2') {
        sizeClasses = 'max-w-[270px] max-h-[125px]';
      } else if (size === '6x4' || size === '5x3') {
        sizeClasses = 'max-w-[290px] max-h-[185px]';
      }
      return `
        <div class="w-full flex flex-col items-center justify-center p-2 select-none">
          <img src="${imageSrc}" alt="${phrase || code}"
               class="${sizeClasses} object-contain transition-all duration-150 drop-shadow-sm"
               style="filter: ${getInkFilter(c)};" />
        </div>
      `;
    }
  }

  // Fallback vectorial para retrocompatibilidad
  // 1. Exceso de Corrección (1EC a 7EC)
  if (col === 'exceso' || code.includes('EC')) {
    if (isThumb) {
      return `
        <div class="w-[74px] h-[74px] flex flex-col items-center justify-center p-1.5 text-center select-none"
             style="background: ${c}; clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);">
          <span class="text-[8px] font-black text-white leading-tight uppercase tracking-tighter px-1">
            ${phrase.replace(' (ARTIFICIAL)', '')}
          </span>
          <span class="text-[5.5px] font-bold text-white/80 tracking-widest mt-0.5 uppercase">CDC-8</span>
        </div>
      `;
    } else {
      return `
        <div class="w-48 h-48 flex flex-col items-center justify-center p-4 text-center select-none shadow-lg"
             style="background: ${c}; clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);">
          <span class="text-base sm:text-lg font-black text-white leading-snug uppercase tracking-tight px-3">
            ${phrase}
          </span>
          <span class="text-[10px] font-bold text-white/80 tracking-widest mt-2 uppercase border-t border-white/30 pt-1">
            LIBRERÍA UNIVERSAL • DOCENTE CDC-8
          </span>
        </div>
      `;
    }
  }

  // 2. Casitas Matemáticas (10E, 11E, 12E)
  if (code === '10E' || code === '11E' || code === '12E') {
    const cols = code === '10E' ? ['D', 'U'] : (code === '11E' ? ['C', 'D', 'U'] : ['UM', 'C', 'D', 'U']);
    if (isThumb) {
      return `
        <div class="w-full max-w-[105px] flex flex-col items-center select-none" style="color: ${c};">
          <div class="w-0 h-0 border-l-[32px] border-l-transparent border-r-[32px] border-r-transparent border-b-[14px]"
               style="border-bottom-color: ${c};"></div>
          <div class="w-full border-2 border-t-0 rounded-b" style="border-color: ${c};">
            <div class="grid grid-cols-${cols.length} border-b font-black text-[9px] text-center" style="border-color: ${c};">
              ${cols.map(colName => `<div>${colName}</div>`).join('')}
            </div>
            <div class="grid grid-cols-${cols.length} divide-x h-8" style="border-color: ${c};">
              ${cols.map(() => `<div></div>`).join('')}
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="w-56 flex flex-col items-center select-none" style="color: ${c};">
          <div class="w-0 h-0 border-l-[54px] border-l-transparent border-r-[54px] border-r-transparent border-b-[24px]"
               style="border-bottom-color: ${c};"></div>
          <div class="w-full border-2 border-t-0 rounded-b p-1" style="border-color: ${c};">
            <div class="grid grid-cols-${cols.length} border-b-2 font-black text-sm text-center py-0.5" style="border-color: ${c};">
              ${cols.map(colName => `<div>${colName}</div>`).join('')}
            </div>
            <div class="grid grid-cols-${cols.length} divide-x-2 divide-dashed h-20" style="border-color: ${c};">
              ${cols.map(() => `<div></div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }
  }

  // 3. Rúbricas / Casilleros de Evaluación (1E a 9E, 13E a 16E, 31b)
  if (code === '31b' || (col === 'especiales' && (code.endsWith('E') || size === '6x4' || size === '5x3'))) {
    if (isThumb) {
      return `
        <div class="w-full h-full flex flex-col justify-between p-1 border border-dashed rounded text-left select-none text-[8px]"
             style="color: ${c}; border-color: ${c};">
          <div class="flex items-center justify-between border-b pb-0.5" style="border-color: ${c};">
            <span class="font-black truncate">${phrase.split('(')[0] || phrase}</span>
            <span class="text-[10px]">${icon}</span>
          </div>
          <div class="space-y-0.5 py-0.5 opacity-90 leading-none">
            <div class="flex gap-1"><span>[ ] Exc</span><span>[ ] MB</span></div>
            <div class="flex gap-1"><span>[ ] Corr</span><span>[ ] Term</span></div>
          </div>
          <div class="border-t pt-0.5 text-[7px] flex justify-between" style="border-color: ${c};">
            <span>Firma: ______</span>
            <span>Fecha: __/__</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="w-full max-w-[280px] p-3 border-2 border-dashed rounded-lg flex flex-col justify-between gap-2 text-left select-none"
             style="color: ${c}; border-color: ${c};">
          <div class="flex items-center justify-between border-b-2 pb-1" style="border-color: ${c};">
            <span class="font-black text-sm sm:text-base">${phrase.split('(')[0] || phrase}</span>
            <span class="text-2xl">${icon}</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 text-xs font-semibold py-1">
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 border border-current inline-block rounded-sm"></span> Excelente</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 border border-current inline-block rounded-sm"></span> Muy Bien</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 border border-current inline-block rounded-sm"></span> Completar</span>
            <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 border border-current inline-block rounded-sm"></span> Corregir</span>
          </div>
          <div class="border-t-2 pt-1.5 text-xs flex justify-between font-mono" style="border-color: ${c};">
            <span>Firma Docente: ____________</span>
            <span>Fecha: ___/___/2026</span>
          </div>
        </div>
      `;
    }
  }

  // 4. Sellos Rectangulares 4x2cm (rectangulares)
  if (size === '4x2' || col === 'rectangulares') {
    if (isThumb) {
      return `
        <div class="w-full h-full flex items-center justify-center gap-1.5 p-1 border-2 rounded-lg select-none"
             style="color: ${c}; border-color: ${c};">
          <span class="text-lg flex-shrink-0">${icon}</span>
          <div class="flex-1 flex flex-col justify-center min-w-0 text-left">
            <span class="text-[9px] font-black uppercase tracking-tight leading-tight line-clamp-2">${phrase}</span>
            ${item.subtext ? `<span class="text-[6.5px] opacity-75 truncate">${item.subtext}</span>` : ''}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="w-full max-w-[270px] h-28 flex items-center justify-center gap-3 p-3 border-2 border-solid rounded-xl select-none shadow-sm"
             style="color: ${c}; border-color: ${c};">
          <span class="text-3xl flex-shrink-0">${icon}</span>
          <div class="flex-1 flex flex-col justify-center min-w-0 text-left">
            <span class="text-base sm:text-lg font-black uppercase tracking-tight leading-tight">${phrase}</span>
            <span class="text-xs opacity-75 mt-0.5 truncate">${item.subtext || 'Catálogo CDC-8 • 4x2cm'}</span>
          </div>
        </div>
      `;
    }
  }

  // 5. Sellos Cuadrados 4x4cm (clasicos, catequesis, ingles, frases, mundial, intensamente, memes, capybaras, harrypotter)
  if (isThumb) {
    return `
      <div class="w-full h-full flex flex-col items-center justify-center p-1 border-2 border-dashed rounded-xl select-none"
           style="color: ${c}; border-color: ${c};">
        <span class="text-xl leading-none my-0.5">${icon}</span>
        <span class="text-[8.5px] font-black uppercase tracking-tight leading-tight line-clamp-2 px-1 text-center">
          ${phrase}
        </span>
        <div class="flex items-center gap-0.5 text-[7px] opacity-75 mt-0.5">
          <span>★</span><span>★</span><span>★</span>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="w-48 h-48 flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-2xl select-none shadow-sm text-center"
           style="color: ${c}; border-color: ${c};">
        <span class="text-4xl sm:text-5xl my-1 leading-none">${icon}</span>
        <span class="text-sm sm:text-base font-black uppercase tracking-tight leading-tight px-2 mt-1">
          ${phrase}
        </span>
        <div class="flex items-center gap-1 text-xs opacity-80 mt-1">
          <span>★</span><span>★</span><span>★</span>
        </div>
        <span class="text-[9px] font-mono tracking-widest uppercase opacity-70 mt-1">
          #${code} • CDC-8
        </span>
      </div>
    `;
  }
}

function renderModalGrid() {
  const container = document.getElementById('modal-grid-container');
  const countEl = document.getElementById('modal-items-count');
  if (!container) return;

  const q = (stampState.modalSearchQuery || '').toLowerCase().trim();

  if (stampState.modalTab === 'drawings') {
    if (typeof STAMP_DRAWINGS_1_TO_168 === 'undefined') return;
    const items = STAMP_DRAWINGS_1_TO_168.filter(d => !q || d.code.includes(q) || d.name.toLowerCase().includes(q) || (d.catName && d.catName.toLowerCase().includes(q)));
    if (countEl) countEl.textContent = `${items.length} de 168 dibujos`;

    container.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3';
    container.innerHTML = items.map(item => `
      <button type="button" data-modal-select-drawing="${item.code}"
              class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-cyan-950/40 text-center transition group flex flex-col items-center justify-between gap-1 shadow">
        <span class="text-xs font-mono font-bold text-cyan-400">#${item.code}</span>
        <div class="w-16 h-16 bg-white rounded-xl p-1.5 flex items-center justify-center shadow my-1 group-hover:scale-110 transition-transform">
          <img src="${item.image}" alt="${item.name}" class="max-w-full max-h-full object-contain filter contrast-125" loading="lazy" />
        </div>
        <span class="text-xs font-bold text-white group-hover:text-cyan-200">${item.name}</span>
        <span class="text-[10px] text-slate-400">${item.catName}</span>
      </button>
    `).join('');

    container.querySelectorAll('[data-modal-select-drawing]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-modal-select-drawing');
        const found = STAMP_DRAWINGS_1_TO_168.find(d => d.code === code);
        if (found) {
          stampState.selectedDrawing = found;
          stampState.drawingPosition = 'left';
          // Activar pestaña modo personalizado
          const modeTab = document.querySelector('[data-stamp-mode="personalizado"]');
          if (modeTab) modeTab.click();

          // Sincronizar botones de posición
          const posBtns = document.querySelectorAll('[data-drawing-pos]');
          posBtns.forEach(b => {
            const isLeft = b.getAttribute('data-drawing-pos') === 'left';
            b.className = isLeft
              ? 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-cyan-500 bg-cyan-950 text-cyan-200 transition'
              : 'drawing-pos-btn py-2 px-3 rounded-xl text-xs font-bold border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition';
          });

          updateStampPreview();
          updateStampSummary();
          document.getElementById('catalog-lightbox-modal').classList.add('hidden');
          showToast(`¡Dibujo #${found.code} (${found.name}) aplicado a tu sello!`);
        }
      });
    });
  }
}

// ─── Generación de Filtro CSS según Color de Tinta para los Dibujos ───
function getInkFilter(hex) {
  switch (hex) {
    case '#1e40af': // Azul
      return 'invert(22%) sepia(93%) saturate(2250%) hue-rotate(218deg) brightness(88%) contrast(98%)';
    case '#dc2626': // Rojo
      return 'invert(21%) sepia(94%) saturate(5620%) hue-rotate(353deg) brightness(93%) contrast(93%)';
    case '#6d28d9': // Violeta
      return 'invert(21%) sepia(86%) saturate(4320%) hue-rotate(262deg) brightness(88%) contrast(98%)';
    case '#111827': // Negro
    default:
      return 'brightness(0)';
  }
}

// ─── Generación de Vista Previa en Vivo (Sincroniza ambas tarjetas) ───
function updateStampPreview() {
  stampState.inkColor = '#111827';
  const previewBoxes = [document.getElementById('stamp-live-preview-box'), document.getElementById('stamp-live-preview-box-2')].filter(Boolean);
  const innerFrames = [document.getElementById('stamp-inner-frame'), document.getElementById('stamp-inner-frame-2')].filter(Boolean);
  const previewContents = [document.getElementById('stamp-live-text-content'), document.getElementById('stamp-live-text-content-2')].filter(Boolean);
  const dimensionBadges = [document.getElementById('stamp-dimension-badge'), document.getElementById('stamp-dimension-badge-2')].filter(Boolean);
  const apparatusBadges = [document.getElementById('stamp-apparatus-badge'), document.getElementById('stamp-apparatus-badge-2')].filter(Boolean);
  const modeBadges = [document.getElementById('stamp-mode-badge'), document.getElementById('stamp-mode-badge-2')].filter(Boolean);
  if (previewBoxes.length === 0 || innerFrames.length === 0 || previewContents.length === 0) return;

  const isVertical = stampState.orientation === 'vertical';

  // Fondo de papel realista para la huella
  previewBoxes.forEach(box => {
    box.className = `stamp-paper-bg relative w-full p-4 sm:p-6 flex items-center justify-center transition-all duration-300 ${isVertical ? 'min-h-[300px]' : 'min-h-[220px]'} shadow-inner rounded-2xl`;
  });

  const dimensionsMapHorizontal = {
    1: '38 x 10 mm (Aprox. Trodat 4910 / Madera Chico)',
    2: '38 x 14 mm (Aprox. Trodat 4911 / Madera Estándar)',
    3: '47 x 18 mm (Aprox. Trodat 4912 / Profesional)',
    4: '58 x 22 mm (Aprox. Trodat 4913 / Empresa & CUIT)'
  };

  const dimensionsMapVertical = {
    1: '10 x 38 mm (Aprox. Trodat 4910 Vertical)',
    2: '14 x 38 mm (Aprox. Trodat 4911 Vertical)',
    3: '18 x 47 mm (Aprox. Trodat 4912 Vertical / Profesional)',
    4: '22 x 58 mm (Aprox. Trodat 4913 Vertical / Empresa)'
  };

  const dimText = (isVertical ? dimensionsMapVertical : dimensionsMapHorizontal)[stampState.lineCount] || 'Medida estándar';
  const appText = stampState.apparatusType === 'automatico'
    ? 'Aparato Automático (Auto-entintable)'
    : 'Cabo de Madera Tradicional (Grabado Láser)';



  modeBadges.forEach(b => { b.textContent = '🏢 Sello Personalizado'; });
  dimensionBadges.forEach(b => { b.textContent = dimText; });
  apparatusBadges.forEach(b => { b.textContent = appText; });

  const frameDimensions = isVertical
    ? 'py-4 px-3 w-[175px] sm:w-[190px] max-w-[205px] min-h-[250px] sm:min-h-[270px] flex flex-col items-center justify-center transition-all duration-300'
    : 'p-4 sm:p-5 w-full max-w-[340px] min-h-[140px] flex flex-col items-center justify-center transition-all duration-300';

  let borderClasses = 'border-2 border-dashed border-slate-400 rounded-sm';
  if (stampState.borderStyle === 'solid') borderClasses = 'border-2 border-solid border-slate-800 rounded-sm';
  if (stampState.borderStyle === 'rounded') borderClasses = 'border-2 border-solid border-slate-800 rounded-xl';
  if (stampState.borderStyle === 'none') borderClasses = 'border border-transparent';

  let frameClass = `${frameDimensions} ${borderClasses}`;

  innerFrames.forEach(frame => {
    frame.className = frameClass;
    if (stampState.borderStyle === 'solid' || stampState.borderStyle === 'rounded') {
      frame.style.borderColor = stampState.inkColor;
    } else {
      frame.style.borderColor = '';
    }
  });

  // Generación de nodos seguros del DOM (Zero innerHTML - 100% Anti-XSS)
  const textAlignClass = stampState.alignment === 'left' ? 'text-left items-start' : (stampState.alignment === 'right' ? 'text-right items-end' : 'text-center items-center');
  const lineSpacingClass = isVertical ? 'space-y-2' : 'space-y-1';

  previewContents.forEach(previewContainer => {
    previewContainer.className = 'stamp-ink-effect flex flex-col justify-center transition-all duration-150 w-full';
    previewContainer.style.color = stampState.inkColor;
    previewContainer.replaceChildren();

    const textLinesContainer = document.createElement('div');
    textLinesContainer.className = `w-full flex flex-col ${textAlignClass} ${lineSpacingClass}`;

    for (let i = 0; i < stampState.lineCount; i++) {
      let rawText = sanitizeInputText(stampState.lines[i] || '');
      const lineFont = stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01';

      if (rawText && isFontUppercase(lineFont)) {
        rawText = rawText.toUpperCase();
      }

      const boldClass = stampState.lineBolds[i] ? 'font-bold' : 'font-normal';
      const italicClass = stampState.lineItalics[i] ? 'italic' : '';
      const scaleClass = isVertical
        ? (i === 0 
            ? 'text-xs sm:text-[13px] font-bold leading-tight break-words tracking-tight' 
            : (i === 1 ? 'text-[10px] sm:text-[11px] leading-tight break-words' : 'text-[9px] sm:text-[10px] leading-tight opacity-95 break-words'))
        : (i === 0 
            ? 'text-base sm:text-lg leading-tight' 
            : (i === 1 ? 'text-xs sm:text-sm leading-snug' : 'text-[11px] sm:text-xs leading-snug opacity-95'));

      const lineDiv = document.createElement('div');
      lineDiv.className = `${lineFont} ${boldClass} ${italicClass} ${scaleClass}`;
      if (rawText) {
        lineDiv.textContent = rawText; // textContent nativo contra inyección XSS
      } else {
        lineDiv.className += ' italic text-gray-300 select-none';
        lineDiv.textContent = `[Línea ${i + 1} vacía]`;
      }
      textLinesContainer.appendChild(lineDiv);
    }

    if (stampState.drawingPosition !== 'none' && stampState.selectedDrawing) {
      const drawingImgSize = isVertical ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-12 h-12 sm:w-14 sm:h-14';
      const drawingBox = document.createElement('div');
      drawingBox.className = 'flex flex-col items-center justify-center flex-shrink-0 px-1 select-none';

      const img = document.createElement('img');
      img.src = stampState.selectedDrawing.image;
      img.alt = stampState.selectedDrawing.name;
      img.className = `${drawingImgSize} object-contain transition-all`;
      img.style.filter = getInkFilter(stampState.inkColor);

      const codeSpan = document.createElement('span');
      codeSpan.className = 'text-[8px] sm:text-[9px] font-mono font-bold tracking-tighter opacity-70 mt-0.5';
      codeSpan.style.color = stampState.inkColor;
      codeSpan.textContent = `#${stampState.selectedDrawing.code}`;

      drawingBox.appendChild(img);
      drawingBox.appendChild(codeSpan);

      const layoutWrapper = document.createElement('div');
      if (isVertical) {
        layoutWrapper.className = 'flex flex-col items-center justify-center gap-1.5 w-full';
        if (stampState.drawingPosition === 'left') {
          layoutWrapper.appendChild(drawingBox);
          layoutWrapper.appendChild(textLinesContainer);
        } else {
          layoutWrapper.appendChild(textLinesContainer);
          layoutWrapper.appendChild(drawingBox);
        }
      } else {
        layoutWrapper.className = 'flex items-center justify-center gap-3 w-full';
        textLinesContainer.classList.add('flex-1');
        if (stampState.drawingPosition === 'left') {
          layoutWrapper.appendChild(drawingBox);
          layoutWrapper.appendChild(textLinesContainer);
        } else {
          layoutWrapper.appendChild(textLinesContainer);
          layoutWrapper.appendChild(drawingBox);
        }
      }
      previewContainer.appendChild(layoutWrapper);
    } else {
      previewContainer.appendChild(textLinesContainer);
    }
  });
}

// ─── Actualiza el resumen técnico de la tarjeta derecha ───
function updateStampSummary() {
  const summaryMode = document.getElementById('summary-mode');
  const summaryDimensions = document.getElementById('summary-dimensions');
  const summaryApparatus = document.getElementById('summary-apparatus');
  const summaryFont = document.getElementById('summary-font');
  const summaryDrawing = document.getElementById('summary-drawing');
  const summaryContent = document.getElementById('summary-content');

  // Actualizar banner de dibujo seleccionado en Paso 4
  updateDrawingBanner();



  if (summaryMode) summaryMode.textContent = 'Sello Personalizado';

  const summaryOrientation = document.getElementById('summary-orientation');
  if (summaryOrientation) {
    summaryOrientation.textContent = stampState.orientation === 'vertical' ? 'Vertical' : 'Horizontal';
  }

  const orientLabel = stampState.orientation === 'vertical' ? 'Vertical' : 'Horizontal';
  const dimBase = (stampState.orientation === 'vertical' ? {
    1: '10 x 38 mm',
    2: '14 x 38 mm',
    3: '18 x 47 mm',
    4: '22 x 58 mm'
  } : {
    1: '38 x 10 mm',
    2: '38 x 14 mm',
    3: '47 x 18 mm',
    4: '58 x 22 mm'
  })[stampState.lineCount] || '47 x 18 mm';

  if (summaryDimensions) summaryDimensions.textContent = `${dimBase} (${orientLabel})`;
  if (summaryApparatus) summaryApparatus.textContent = stampState.apparatusType === 'automatico' ? 'Aparato Automático' : 'Cabo de Madera';

  if (summaryFont) {
    const activeFonts = [];
    for (let i = 0; i < stampState.lineCount; i++) {
      activeFonts.push(stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01');
    }
    const allSame = activeFonts.every(f => f === activeFonts[0]);

    if (allSame) {
      summaryFont.textContent = `${getFontShortName(activeFonts[0])} (Todas las líneas)`;
    } else {
      // Desglose limpio
      summaryFont.innerHTML = activeFonts
        .map((f, idx) => `<span class="block text-xs font-semibold text-slate-200">Línea ${idx + 1}: <span class="text-cyan-400 font-bold">${getFontShortName(f)}</span></span>`)
        .join('');
    }
  }

  if (summaryDrawing) {
    if (stampState.drawingPosition === 'none' || !stampState.selectedDrawing) {
      summaryDrawing.textContent = 'Sin dibujo';
    } else {
      const posStr = stampState.drawingPosition === 'left' ? 'Izq.' : 'Der.';
      summaryDrawing.textContent = `#${stampState.selectedDrawing.code} - ${stampState.selectedDrawing.name} (${posStr})`;
    }
  }
  if (summaryContent) {
    const firstLine = (stampState.lines[0] || '').trim();
    summaryContent.textContent = firstLine ? `"${firstLine}"` : `${stampState.lineCount} Líneas indicadas`;
  }
}

// ─── Agregar Sello al Carrito de Compras Unificado ───
function handleAddStampToCart() {
  if (!window.LibreriaCart) return;

  const aparatoStr = stampState.apparatusType === 'automatico' ? 'Aparato Automático Auto-entintable' : 'Cabo de Madera Tradicional';
  const orientStr = stampState.orientation === 'vertical' ? 'Vertical (18 x 47 mm)' : 'Horizontal (47 x 18 mm)';

  const activeLines = [];
  const activeFonts = [];
  for (let i = 0; i < stampState.lineCount; i++) {
    const txt = (stampState.lines[i] || '').trim();
    if (txt) {
      activeLines.push(txt);
      activeFonts.push(stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01');
    }
  }

  if (activeLines.length === 0) {
    showToast('Por favor ingrese al menos una línea de texto en el sello.');
    return;
  }

  window.LibreriaCart.addItem({
    id: 'stamp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type: 'stamp',
    name: 'Sello Personalizado (' + (stampState.apparatusType === 'automatico' ? 'Automático' : 'Madera') + ')',
    price: null,
    priceFormatted: 'A cotizar',
    quantity: 1,
    category: 'Sellos Personalizados',
    stampDetails: {
      apparatus: aparatoStr,
      orientation: orientStr,
      lineCount: stampState.lineCount,
      lines: activeLines,
      fonts: activeFonts,
      inkColor: 'Tinta Negra',
      alignment: stampState.alignment,
      drawing: stampState.drawingPosition !== 'none' && stampState.selectedDrawing ? {
        code: stampState.selectedDrawing.code,
        name: stampState.selectedDrawing.name
      } : null,
      drawingPosition: stampState.drawingPosition
    }
  });
}

// ─── Generador de Mensaje de WhatsApp Especializado ───
function handleWhatsAppOrder() {
  let message = `¡Hola *${BUSINESS_CONFIG.name}*!\n\n`;

  const aparatoStr = stampState.apparatusType === 'automatico' ? 'Aparato Automático Auto-entintable' : 'Cabo de Madera Tradicional';
  const colorStr = 'Tinta Negra';



  const alineacionStr = stampState.alignment === 'center' ? 'Centrado' : (stampState.alignment === 'left' ? 'Izquierda' : 'Derecha');

  let dibujoStr = 'Sin dibujo';
  if (stampState.drawingPosition !== 'none' && stampState.selectedDrawing) {
    dibujoStr = `Dibujo #${stampState.selectedDrawing.code} - ${stampState.selectedDrawing.name} (Ubicación: ${stampState.drawingPosition === 'left' ? 'A la Izquierda' : 'A la Derecha'})`;
  }

  let lineasTexto = '';
  for (let i = 0; i < stampState.lineCount; i++) {
    let txt = (stampState.lines[i] || '').trim();
    const lineFont = stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01';
    if (txt && isFontUppercase(lineFont)) txt = txt.toUpperCase();
    const fontLabel = getFontShortName(lineFont);
    const styleFlags = [];
    if (stampState.lineBolds[i]) styleFlags.push('Negrita');
    if (stampState.lineItalics[i]) styleFlags.push('Cursiva');
    const styleText = styleFlags.length > 0 ? ` [${styleFlags.join(', ')}]` : '';

    lineasTexto += `  • Línea ${i + 1}: "${txt || '(Sin texto indicado)'}" (Fuente: ${fontLabel}${styleText})\n`;
  }

  const orientStr = stampState.orientation === 'vertical' ? 'Vertical (18 x 47 mm / Formato vertical)' : 'Horizontal (47 x 18 mm / Apaisado tradicional)';

  message += `Quiero solicitar *Presupuesto* para confeccionar un *Sello Personalizado* con este diseño:\n\n` +
    `*Tipo de Aparato:* ${aparatoStr}\n` +
    `*Orientación:* ${orientStr}\n` +
    `*Cantidad de Líneas:* ${stampState.lineCount}\n` +
    `*Color de Tinta:* ${colorStr}\n` +
    `*Alineación:* ${alineacionStr}\n` +
    `*Dibujo del Sello:* ${dibujoStr}\n\n` +
    `*Texto y tipografía por línea:*\n` +
    `${lineasTexto}\n` +
    `¿Me confirmás el presupuesto y plazo de entrega para retirar por el local de Valentín Alsina? ¡Muchas gracias!`;

  const encodedUrl = `https://wa.me/${BUSINESS_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(encodedUrl, '_blank');
}

// ─── Copia las especificaciones al portapapeles ───
function handleCopyDetails() {


  let textoPlano = `PEDIDO DE SELLO - ${BUSINESS_CONFIG.name}\n`;

  const dibujoInfo = (stampState.drawingPosition !== 'none' && stampState.selectedDrawing)
    ? `#${stampState.selectedDrawing.code} - ${stampState.selectedDrawing.name} (${stampState.drawingPosition === 'left' ? 'Izquierda' : 'Derecha'})`
    : 'Sin dibujo';

  textoPlano += `Modalidad: Sello Personalizado\n` +
    `Aparato: ${stampState.apparatusType === 'automatico' ? 'Automático' : 'Madera'}\n` +
    `Líneas: ${stampState.lineCount}\n` +
    `Tinta: ${getInkColorName(stampState.inkColor)}\n` +
    `Dibujo: ${dibujoInfo}\n` +
    `Líneas y Tipografías:\n`;

  for (let i = 0; i < stampState.lineCount; i++) {
    let txt = (stampState.lines[i] || '').trim();
    const lineFont = stampState.lineFonts[i] || stampState.fontFamily || 'font-stamp-01';
    if (txt && isFontUppercase(lineFont)) txt = txt.toUpperCase();
    textoPlano += `• Línea ${i + 1}: "${txt || '(vacío)'}" (Fuente: ${getFontShortName(lineFont)})\n`;
  }

  navigator.clipboard.writeText(textoPlano).then(() => {
    showToast("¡Especificaciones del sello copiadas!");
  }).catch(() => {
    showToast("Diseño listo para enviar por WhatsApp.");
  });
}

function getInkColorName(hex) {
  const map = {
    '#111827': 'Negro',
    '#1e40af': 'Azul',
    '#dc2626': 'Rojo',
    '#6d28d9': 'Violeta'
  };
  return map[hex] || 'Negro';
}

const STAMP_FONTS_CATALOG = [
  // 1. Estándar (01 a 11)
  { id: 'font-stamp-01', num: '01', name: 'Arial', short: '01 - Arial', group: 'Estándar (01 a 11)', fullName: '01 - Arial (Estándar)' },
  { id: 'font-stamp-02', num: '02', name: 'Times New Roman', short: '02 - Times New Roman', group: 'Estándar (01 a 11)', fullName: '02 - Times New Roman (Estándar)' },
  { id: 'font-stamp-03', num: '03', name: 'Archivo Narrow', short: '03 - Archivo Narrow', group: 'Estándar (01 a 11)', fullName: '03 - Archivo Narrow (Estándar)' },
  { id: 'font-stamp-04', num: '04', name: 'Barlow', short: '04 - Barlow', group: 'Estándar (01 a 11)', fullName: '04 - Barlow (Estándar)' },
  { id: 'font-stamp-05', num: '05', name: 'Arvo', short: '05 - Arvo', group: 'Estándar (01 a 11)', fullName: '05 - Arvo (Estándar)' },
  { id: 'font-stamp-06', num: '06', name: 'Courier Prime', short: '06 - Courier Prime', group: 'Estándar (01 a 11)', fullName: '06 - Courier Prime (Estándar)' },
  { id: 'font-stamp-07', num: '07', name: 'Varela Round', short: '07 - Varela Round', group: 'Estándar (01 a 11)', fullName: '07 - Varela Round (Estándar)' },
  { id: 'font-stamp-08', num: '08', name: 'Hobo Std', short: '08 - Hobo Std', group: 'Estándar (01 a 11)', fullName: '08 - Hobo Std (Estándar)' },
  { id: 'font-stamp-09', num: '09', name: 'Rickety', short: '09 - Rickety', group: 'Estándar (01 a 11)', fullName: '09 - Rickety (Estándar)', noNumbers: true },
  { id: 'font-stamp-10', num: '10', name: 'Impact', short: '10 - Impact', group: 'Estándar (01 a 11)', fullName: '10 - Impact (Estándar)' },
  { id: 'font-stamp-11', num: '11', name: 'Orbitron', short: '11 - Orbitron', group: 'Estándar (01 a 11)', fullName: '11 - Orbitron (Estándar)' },

  // 2. Solo Mayúsculas (12 a 16)
  { id: 'font-stamp-12', num: '12', name: 'Bebas Neue', short: '12 - Bebas Neue', group: 'Solo Mayúsculas (12 a 16)', fullName: '12 - Bebas Neue (Solo Mayúsculas)', uppercase: true },
  { id: 'font-stamp-13', num: '13', name: 'Lemon', short: '13 - Lemon', group: 'Solo Mayúsculas (12 a 16)', fullName: '13 - Lemon (Solo Mayúsculas)', uppercase: true, specialNotice: true },
  { id: 'font-stamp-14', num: '14', name: 'TrashHand', short: '14 - TrashHand', group: 'Solo Mayúsculas (12 a 16)', fullName: '14 - TrashHand (Solo Mayúsculas)', uppercase: true, specialNotice: true },
  { id: 'font-stamp-15', num: '15', name: 'Amatic SC', short: '15 - Amatic SC', group: 'Solo Mayúsculas (12 a 16)', fullName: '15 - Amatic SC (Solo Mayúsculas)', uppercase: true },
  { id: 'font-stamp-16', num: '16', name: 'Charge Vector', short: '16 - Charge Vector', group: 'Solo Mayúsculas (12 a 16)', fullName: '16 - Charge Vector (Solo Mayúsculas)', uppercase: true, specialNotice: true },

  // 3. Cursivas (17 a 23)
  { id: 'font-stamp-17', num: '17', name: 'Script MT Bold', short: '17 - Script MT Bold', group: 'Cursivas (17 a 23)', fullName: '17 - Script MT Bold (Cursiva)' },
  { id: 'font-stamp-18', num: '18', name: 'Satisfy', short: '18 - Satisfy', group: 'Cursivas (17 a 23)', fullName: '18 - Satisfy (Cursiva)' },
  { id: 'font-stamp-19', num: '19', name: 'Dancing Script', short: '19 - Dancing Script', group: 'Cursivas (17 a 23)', fullName: '19 - Dancing Script (Cursiva)' },
  { id: 'font-stamp-20', num: '20', name: 'Courgette', short: '20 - Courgette', group: 'Cursivas (17 a 23)', fullName: '20 - Courgette (Cursiva)', specialNotice: true },
  { id: 'font-stamp-21', num: '21', name: 'Kalam', short: '21 - Kalam', group: 'Cursivas (17 a 23)', fullName: '21 - Kalam (Cursiva)' },
  { id: 'font-stamp-22', num: '22', name: 'Always In My Heart', short: '22 - Always In My Heart', group: 'Cursivas (17 a 23)', fullName: '22 - Always In My Heart (Cursiva)' },
  { id: 'font-stamp-23', num: '23', name: 'Birds of Paradise', short: '23 - Birds of Paradise', group: 'Cursivas (17 a 23)', fullName: '23 - Birds of Paradise (Cursiva)', noNumbers: true, specialNotice: true }
];

function getFontMeta(cls) {
  return STAMP_FONTS_CATALOG.find(f => f.id === cls) || STAMP_FONTS_CATALOG[0];
}

function getFontName(cls) {
  return getFontMeta(cls).fullName;
}

function getFontShortName(cls) {
  return getFontMeta(cls).short;
}

function isFontUppercase(cls) {
  return !!getFontMeta(cls).uppercase;
}

/* ==========================================================================
   2. SECCIÓN DE INSUMOS DE LIBRERÍA (TABS & BÚSQUEDA)
   ========================================================================== */
function initStationeryTabs() {}
function renderStationeryProducts() {}

/* ==========================================================================
   4. MENÚ MOBILE RESPONSIVO
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-menu-close');
  const mobileMenu = document.getElementById('mobile-menu-drawer');
  const links = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !mobileMenu) return;

  function openMenu() {
    mobileMenu.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    mobileMenu.classList.add('hidden');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) closeMenu();
  });

  links.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

/* ==========================================================================
   5. BOTÓN FLOTANTE Y NOTIFICACIONES TOAST
   ========================================================================== */

function initWhatsAppFloating() {
  const floatingBtn = document.getElementById('floating-whatsapp');
  if (floatingBtn) {
    floatingBtn.href = createSafeWhatsAppUrl(BUSINESS_CONFIG.whatsappNumber, `Hola ${BUSINESS_CONFIG.name}! Me contacto desde su página web para hacer una consulta.`);
  }
}

function showToast(message) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = 'fixed bottom-24 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-cyan-800/80 opacity-0 transform translate-y-4 pointer-events-none transition-all duration-300';
    document.body.appendChild(toast);
  }

  toast.replaceChildren();

  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('class', 'w-5 h-5 text-cyan-400 flex-shrink-0');
  iconSvg.setAttribute('fill', 'currentColor');
  iconSvg.setAttribute('viewBox', '0 0 20 20');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute('d', 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z');
  iconSvg.appendChild(path);

  const textSpan = document.createElement('span');
  textSpan.textContent = String(message);

  toast.appendChild(iconSvg);
  toast.appendChild(textSpan);

  toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');

  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
  }, 3200);
}
})();
