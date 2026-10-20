/**
 * LIBRERÍA UNIVERSAL - SINCRONIZADOR DINÁMICO DE CATÁLOGO (FRONTEND PÚBLICO)
 * Conecta las secciones de Inicio, Librería y Servicios con la Base de Datos / API REST.
 * Replicando la arquitectura desacoplada de tesla-computacion.
 */

(function () {
  const BUSINESS_PHONE = "5491126097125";
  let dynamicProducts = [];
  let currentCategory = 'all';
  let currentSearch = '';

  /**
   * Inicializa la sincronización de productos al cargar la página
   */
  const startCatalogSync = async () => {
    setupCatalogFilters();
    fetchSchedule();
    updateLiveScheduleStatus();
    setInterval(updateLiveScheduleStatus, 30000);
    await fetchCatalogProducts();
    renderFeaturedProducts();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startCatalogSync);
  } else {
    startCatalogSync();
  }

  // Re-sincronizar horarios al volver a la pestaña (por si se editaron en el admin)
  window.addEventListener('focus', () => {
    fetchSchedule();
    updateLiveScheduleStatus();
  });

  /**
   * Obtiene los productos desde la API REST (/api/products)
   */
  async function fetchCatalogProducts() {
    const container = document.getElementById('stationery-products-grid');
    if (container && dynamicProducts.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <div class="inline-flex items-center gap-2">
            <svg class="w-5 h-5 animate-spin text-brand-cyan" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Cargando catálogo en tiempo real...</span>
          </div>
        </div>
      `;
    }

    try {
      const response = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('API offline');
      
      const data = await response.json();
      if (data && data.success && Array.isArray(data.products)) {
        dynamicProducts = data.products;
      } else {
        dynamicProducts = [];
      }
    } catch (err) {
      console.info('Aviso al sincronizar catálogo:', err.message);
      dynamicProducts = [];
    } finally {
      renderCategoryTabs();
      renderDynamicStationeryGrid();
      renderFeaturedProducts();
    }
  }

  /**
   * Renderiza la sección de Productos Destacados en Portada (#inicio) si existe el contenedor
   */
  function renderFeaturedProducts() {
    const container = document.getElementById('productos-destacados-grid');
    if (!container) return;

    const featured = dynamicProducts.filter(p => p.destacado === true);
    if (featured.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = '';
    featured.slice(0, 6).forEach(product => {
      const card = createProductCardElement(product);
      container.appendChild(card);
    });
  }

  /**
   * Renderiza dinámicamente las pestañas de categorías según los productos disponibles
   */
  function renderCategoryTabs() {
    const container = document.getElementById('stationery-category-tabs');
    if (!container) return;

    const rawCategories = dynamicProducts.map(p => p.categoria).filter(Boolean);
    const uniqueCategories = Array.from(new Set(rawCategories));

    container.replaceChildren();

    // Pestaña "Todos los Productos"
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    const isAllActive = currentCategory === 'all';
    allBtn.className = `px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
      isAllActive 
        ? 'bg-brand-cyan text-[#0B0F19] shadow-md font-bold' 
        : 'bg-[#111827] text-slate-300 hover:bg-[#1F2937] hover:text-white'
    }`;
    allBtn.textContent = 'Todos los Productos';
    allBtn.addEventListener('click', () => {
      currentCategory = 'all';
      renderCategoryTabs();
      renderDynamicStationeryGrid();
    });
    container.appendChild(allBtn);

    // Pestañas individuales para cada categoría existente
    uniqueCategories.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = currentCategory.toLowerCase() === cat.toLowerCase();
      btn.className = `px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
        isActive 
          ? 'bg-brand-cyan text-[#0B0F19] shadow-md font-bold' 
          : 'bg-[#111827] text-slate-300 hover:bg-[#1F2937] hover:text-white'
      }`;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        currentCategory = cat;
        renderCategoryTabs();
        renderDynamicStationeryGrid();
      });
      container.appendChild(btn);
    });
  }

  /**
   * Configura los filtros y búsqueda de la sección de Librería
   */
  function setupCatalogFilters() {
    const searchInput = document.getElementById('stationery-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderDynamicStationeryGrid();
      });
    }
  }

  /**
   * Renderiza las tarjetas en la grilla de Librería (#stationery-products-grid)
   */
  function renderDynamicStationeryGrid() {
    const container = document.getElementById('stationery-products-grid');
    if (!container) return;

    // Si el catálogo está completamente vacío (ej: se vació desde admin)
    if (!dynamicProducts || dynamicProducts.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-[#111827] rounded-2xl border border-[#1F2937] p-8">
          <div class="w-16 h-16 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h3 class="text-lg font-display font-bold text-white mb-2">Catálogo en proceso de carga</h3>
          <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6 font-body font-light">
            Actualmente no hay artículos publicados en el catálogo. Si buscás un producto o presupuesto, escribinos directamente por WhatsApp.
          </p>
          <a href="https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Librería Universal! Quiero consultar por artículos de librería:')}" 
             target="_blank" 
             class="inline-flex items-center gap-2 px-6 py-3 bg-[#159A5C] hover:bg-[#12804d] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition">
             <svg class="w-4 h-4 fill-current flex-shrink-0" viewBox="5.8 5.8 12.4 12.4"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
             <span>Consultar por WhatsApp</span>
          </a>
        </div>
      `;
      return;
    }

    // Filtrar según categoría seleccionada y búsqueda
    let filtered = dynamicProducts;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.categoria && p.categoria.toLowerCase() === currentCategory.toLowerCase());
    }

    if (currentSearch) {
      filtered = filtered.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(currentSearch)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(currentSearch)) ||
        (p.categoria && p.categoria.toLowerCase().includes(currentSearch))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-14 text-center bg-[#111827] rounded-2xl border border-[#1F2937] p-8">
          <svg class="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-base font-semibold text-white">No encontramos productos cargados en esta categoría.</p>
          <p class="text-xs text-slate-400 mt-1">¡Consultanos directamente por WhatsApp! Disponemos de amplio stock en el local.</p>
          <a href="https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Librería Universal! Busco un artículo de esta categoría:')}" 
             target="_blank" 
             class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#159A5C] hover:bg-[#12804d] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-900/30">
             <svg class="w-4 h-4 fill-current flex-shrink-0" viewBox="5.8 5.8 12.4 12.4"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
             <span>Consultar por Mensaje de WhatsApp</span>
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(product => {
      const card = createProductCardElement(product);
      container.appendChild(card);
    });
  }

  /**
   * Fabrica el elemento DOM de una tarjeta de producto con estética editorial y botón de WhatsApp
   */
  function createProductCardElement(product) {
    const card = document.createElement('div');
    card.className = 'group flex flex-col justify-between bg-[#111827] rounded-2xl p-5 border border-[#1F2937] hover:border-brand-cyan/60 shadow-lg hover:shadow-brand-cyan/10 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden';

    // Formato de precio y mensaje prearmado para WhatsApp
    const hasPrice = product.precio && Number(product.precio) > 0;
    const priceFormatted = hasPrice 
      ? `$ ${Number(product.precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : 'Consultar presupuesto';

    const waMessage = `Hola Librería Universal! Quiero consultar por el producto: *${product.nombre}* (${priceFormatted})`;
    const waUrl = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(waMessage)}`;

    // Colores de badges por categoría
    let categoryBadgeClass = 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
    if (product.categoria === 'Librería Escolar') categoryBadgeClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (product.categoria === 'Servicios de Imprenta') categoryBadgeClass = 'bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30';
    if (product.categoria === 'Sellos') categoryBadgeClass = 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    if (product.categoria === 'Sellos de corrección docente') categoryBadgeClass = 'bg-pink-500/15 text-pink-400 border border-pink-500/30';
    if (product.categoria === 'Insumos / Otros') categoryBadgeClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/30';

    const imgUrl = product.imagen_url || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80';

    card.innerHTML = `
      <div>
        <!-- Foto del Producto con efecto hover (Fondo blanco para fotos de stock y PNGs) -->
        <div class="w-full h-48 sm:h-52 rounded-xl bg-white border border-slate-200/80 mb-4 overflow-hidden relative flex items-center justify-center p-3 group/img shadow-sm">
          <img src="${imgUrl}" alt="${escapeHTML(product.nombre)}" class="max-w-full max-h-full object-contain group-hover/img:scale-105 transition-transform duration-300" loading="lazy" />
          
          ${product.destacado ? `
            <span class="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-brand-magenta text-white shadow-md z-10">
              Destacado
            </span>
          ` : ''}
        </div>

        <!-- Badges y Categoría -->
        <div class="flex items-start justify-between gap-2 mb-2.5">
          <span class="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md ${categoryBadgeClass}">
            ${escapeHTML(product.categoria)}
          </span>
          <span class="inline-flex items-center gap-1.5 text-[11px] font-medium ${product.stock ? 'text-emerald-400' : 'text-amber-400'}">
            <span class="w-1.5 h-1.5 rounded-full ${product.stock ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
            ${product.stock ? 'Stock Inmediato' : 'Por encargue'}
          </span>
        </div>

        <!-- Título -->
        <h4 class="text-base font-bold text-white group-hover:text-brand-cyan transition leading-snug mb-2 font-display">
          ${escapeHTML(product.nombre)}
        </h4>

        <!-- Descripción -->
        <p class="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2 font-light font-body">
          ${escapeHTML(product.descripcion || 'Artículo disponible en local a la calle.')}
        </p>
      </div>

      <!-- Footer de Tarjeta: Precio y Acciones de Compra -->
      <div class="pt-4 border-t border-[#1F2937] flex items-center justify-between gap-2">
        <div class="min-w-0">
          <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-body">Precio</span>
          <span class="font-mono font-bold truncate block ${hasPrice ? 'text-white text-base' : 'text-brand-yellow text-xs'}">
            ${priceFormatted}
          </span>
        </div>

        <div class="flex items-center gap-1.5 flex-shrink-0">
          <!-- Botón Agregar al Carrito -->
          <button type="button" 
                  class="btn-add-product-cart inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-brand-cyan hover:bg-[#0092ca] text-[#080B10] rounded-xl shadow-md transition-all active:scale-95 group/cart"
                  title="Agregar este artículo a tu Carrito">
            <svg class="w-4 h-4 flex-shrink-0 transition-transform group-hover/cart:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <span class="font-body font-bold">Agregar</span>
          </button>

          <!-- Botón WhatsApp Consulta Rápida Directa -->
          <a href="${waUrl}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all shadow-sm"
             title="Consultar únicamente por este producto en WhatsApp">
            <svg class="w-4 h-4 fill-current flex-shrink-0" viewBox="5.8 5.8 12.4 12.4">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/>
            </svg>
          </a>
        </div>
      </div>
    `;

    const addCartBtn = card.querySelector('.btn-add-product-cart');
    if (addCartBtn) {
      addCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.LibreriaCart) {
          window.LibreriaCart.addItem({
            productId: product.id,
            type: 'product',
            name: product.nombre,
            price: typeof product.precio === 'number' ? product.precio : null,
            priceFormatted: priceFormatted,
            quantity: 1,
            image: imgUrl,
            category: product.categoria
          });
        }
      });
    }

    const imgEl = card.querySelector('img');
    if (imgEl) {
      imgEl.addEventListener('error', () => {
        imgEl.src = 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80';
      }, { once: true });
    }

    return card;
  }

  /**
   * Sincroniza los horarios de atención al público desde la API REST (/api/schedule)
   */
  async function fetchSchedule() {
    try {
      const response = await fetch('/api/schedule?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (!data || !data.success || !data.schedule) return;

      const { weekdays, saturdays, sundays, holidays, specialNotice } = data.schedule;

      // Elementos de la Portada (Hero)
      const heroWeekdays = document.getElementById('schedule-hero-weekdays');
      const heroSaturdays = document.getElementById('schedule-hero-saturdays');
      const heroSundays = document.getElementById('schedule-hero-sundays');
      const heroHolidays = document.getElementById('schedule-hero-holidays');
      const heroNotice = document.getElementById('schedule-hero-notice');

      if (heroWeekdays && weekdays) heroWeekdays.textContent = weekdays;
      if (heroSaturdays && saturdays) heroSaturdays.textContent = saturdays;
      if (heroSundays && sundays) heroSundays.textContent = sundays;
      if (heroHolidays && holidays) {
        if (holidays.trim().toLowerCase() === 'consultar por whatsapp') {
          heroHolidays.textContent = 'Consultar en wsp';
        } else {
          heroHolidays.textContent = holidays;
        }
      }

      if (heroNotice) {
        if (specialNotice && specialNotice.trim()) {
          heroNotice.textContent = '📢 ' + specialNotice.trim();
          heroNotice.classList.remove('hidden');
        } else {
          heroNotice.classList.add('hidden');
        }
      }

      // Elementos del Pie de Página (Footer)
      const footerWeekdays = document.getElementById('schedule-footer-weekdays');
      const footerSaturdays = document.getElementById('schedule-footer-saturdays');
      const footerSundays = document.getElementById('schedule-footer-sundays');
      const footerHolidays = document.getElementById('schedule-footer-holidays');
      const footerNotice = document.getElementById('schedule-footer-notice');

      if (footerWeekdays && weekdays) footerWeekdays.textContent = 'Lun a Vie: ' + weekdays;
      if (footerSaturdays && saturdays) footerSaturdays.textContent = 'Sábados: ' + saturdays;
      if (footerSundays && sundays) footerSundays.textContent = 'Domingos: ' + sundays;
      if (footerHolidays && holidays) footerHolidays.textContent = holidays;

      if (footerNotice) {
        if (specialNotice && specialNotice.trim()) {
          footerNotice.textContent = '📢 ' + specialNotice.trim();
          footerNotice.classList.remove('hidden');
        } else {
          footerNotice.classList.add('hidden');
        }
      }

      // Elementos de la Tarjeta Institucional (Cotizador de Sellos)
      const stampWeekdays = document.getElementById('schedule-stamp-weekdays');
      const stampSaturdays = document.getElementById('schedule-stamp-saturdays');
      const stampSundays = document.getElementById('schedule-stamp-sundays');
      const stampHolidays = document.getElementById('schedule-stamp-holidays');
      const stampNotice = document.getElementById('schedule-stamp-notice');

      if (stampWeekdays && weekdays) stampWeekdays.textContent = weekdays;
      if (stampSaturdays && saturdays) stampSaturdays.textContent = saturdays;
      if (stampSundays && sundays) stampSundays.textContent = sundays;
      if (stampHolidays && holidays) {
        if (holidays.trim().toLowerCase() === 'consultar por whatsapp') {
          stampHolidays.textContent = 'Consultar en wsp';
        } else {
          stampHolidays.textContent = holidays;
        }
      }

      if (stampNotice) {
        if (specialNotice && specialNotice.trim()) {
          stampNotice.textContent = '📢 ' + specialNotice.trim();
          stampNotice.classList.remove('hidden');
        } else {
          stampNotice.classList.add('hidden');
        }
      }
    } catch (err) {
      // Si falla la red se mantienen los valores estáticos
    }
  }


  /**
   * Calcula e inyecta el estado en tiempo real (Abierto/Cerrado) usando America/Argentina/Buenos_Aires
   * Horarios:
   * Lun a Vie: 09:30 a 13:15 y 16:00 a 19:30 hs
   * Sábados: 10:00 a 13:00 y 16:30 a 19:00 hs
   * Domingos: Cerrado
   */
  function updateLiveScheduleStatus() {
    const topbarEl = document.getElementById('topbar-live-status');
    const heroBadgeEl = document.getElementById('hero-live-schedule-badge');

    if (!topbarEl && !heroBadgeEl) return;

    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric'
      });

      const parts = formatter.formatToParts(now);
      const map = {};
      parts.forEach(p => map[p.type] = p.value);

      const hour = parseInt(map.hour, 10);
      const minute = parseInt(map.minute, 10);
      const currentMinutes = hour * 60 + minute;
      const daysMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      const day = daysMap[map.weekday] ?? 0;

      let isOpen = false;
      let statusTitle = '';
      let statusSubtitle = '';

      if (day >= 1 && day <= 5) { // Lunes a Viernes
        if (currentMinutes >= 570 && currentMinutes < 795) { // 09:30 - 13:15
          isOpen = true;
          statusTitle = 'Abierto ahora';
          statusSubtitle = 'Cierra 13:15 hs';
        } else if (currentMinutes >= 960 && currentMinutes < 1170) { // 16:00 - 19:30
          isOpen = true;
          statusTitle = 'Abierto ahora';
          statusSubtitle = 'Cierra 19:30 hs';
        } else if (currentMinutes < 570) {
          isOpen = false;
          statusTitle = 'Cerrado ahora';
          statusSubtitle = 'Abre hoy a las 09:30 hs';
        } else if (currentMinutes >= 795 && currentMinutes < 960) {
          isOpen = false;
          statusTitle = 'Cerrado al mediodía';
          statusSubtitle = 'Abre hoy a las 16:00 hs';
        } else {
          isOpen = false;
          statusTitle = 'Cerrado por hoy';
          statusSubtitle = day === 5 ? 'Abre mañana a las 10:00 hs' : 'Abre mañana a las 09:30 hs';
        }
      } else if (day === 6) { // Sábado
        if (currentMinutes >= 600 && currentMinutes < 780) { // 10:00 - 13:00
          isOpen = true;
          statusTitle = 'Abierto ahora';
          statusSubtitle = 'Cierra 13:00 hs';
        } else if (currentMinutes >= 990 && currentMinutes < 1140) { // 16:30 - 19:00
          isOpen = true;
          statusTitle = 'Abierto ahora';
          statusSubtitle = 'Cierra 19:00 hs';
        } else if (currentMinutes < 600) {
          isOpen = false;
          statusTitle = 'Cerrado ahora';
          statusSubtitle = 'Abre hoy a las 10:00 hs';
        } else if (currentMinutes >= 780 && currentMinutes < 990) {
          isOpen = false;
          statusTitle = 'Cerrado al mediodía';
          statusSubtitle = 'Abre hoy a las 16:30 hs';
        } else {
          isOpen = false;
          statusTitle = 'Cerrado';
          statusSubtitle = 'Abre el lunes a las 09:30 hs';
        }
      } else { // Domingo
        isOpen = false;
        statusTitle = 'Cerrado hoy domingo';
        statusSubtitle = 'Abre el lunes a las 09:30 hs';
      }

      // 1. Actualizar indicador Topbar
      if (topbarEl) {
        if (isOpen) {
          topbarEl.className = 'inline-flex items-center gap-2 text-[11px] font-semibold text-emerald-300 font-mono';
          topbarEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>' + statusTitle + ' · ' + statusSubtitle + '</span>';
        } else {
          topbarEl.className = 'inline-flex items-center gap-2 text-[11px] font-semibold text-rose-300 font-mono';
          topbarEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span>' + statusTitle + ' (' + statusSubtitle + ')</span>';
        }
      }

      // 2. Actualizar badge Hero
      if (heroBadgeEl) {
        if (isOpen) {
          heroBadgeEl.className = 'mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-950/40 font-body';
          heroBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span><span>' + statusTitle + ' (' + statusSubtitle + ')</span>';
        } else {
          heroBadgeEl.className = 'mt-2 mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-md shadow-rose-950/40 font-body';
          heroBadgeEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0"></span><span>' + statusTitle + ' · ' + statusSubtitle + '</span>';
        }
      }
    } catch (e) {
      console.warn('Error al calcular horario en vivo:', e);
    }
  }

  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  window.catalogSync = {
    fetchCatalogProducts,
    fetchSchedule,
    updateLiveScheduleStatus,
    getProducts: () => dynamicProducts
  };
})();
