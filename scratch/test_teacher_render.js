const { TEACHER_STAMPS_DATA, TEACHER_COLLECTIONS } = require('../js/stamp-data.js');

console.log('Total teacher stamps:', TEACHER_STAMPS_DATA.length);
console.log('Total collections:', TEACHER_COLLECTIONS.length);

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

// Test rendering all 290 items in thumb and preview modes
let thumbSuccess = 0;
let previewSuccess = 0;
TEACHER_STAMPS_DATA.forEach(item => {
  const thumb = renderTeacherStampVisual(item, '#111827', 'thumb');
  const prev = renderTeacherStampVisual(item, '#1e40af', 'preview');
  if (thumb.length > 20) thumbSuccess++;
  if (prev.length > 20) previewSuccess++;
});

console.log(`Rendered ${thumbSuccess} / ${TEACHER_STAMPS_DATA.length} thumbs successfully.`);
console.log(`Rendered ${previewSuccess} / ${TEACHER_STAMPS_DATA.length} previews successfully.`);
