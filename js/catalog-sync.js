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
  document.addEventListener('DOMContentLoaded', async () => {
    await fetchCatalogProducts();
    renderFeaturedProducts();
    setupCatalogFilters();
  });

  /**
   * Obtiene los productos desde la API REST (/api/products)
   */
  async function fetchCatalogProducts() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('API offline');
      
      const data = await response.json();
      if (data && data.success && Array.isArray(data.products) && data.products.length > 0) {
        dynamicProducts = data.products;
        renderDynamicStationeryGrid();
      }
    } catch (err) {
      console.info('Catálogo conectado a datos locales de respaldo.');
    }
  }

  /**
   * Renderiza la sección de Productos Destacados en Portada (#inicio)
   */
  function renderFeaturedProducts() {
    const container = document.getElementById('productos-destacados-grid');
    if (!container) return;

    const featured = dynamicProducts.filter(p => p.destacado === true);
    if (featured.length === 0) return;

    container.innerHTML = '';

    featured.slice(0, 6).forEach(product => {
      const card = createProductCardElement(product);
      container.appendChild(card);
    });
  }

  /**
   * Configura los filtros de pestañas y búsqueda de la sección de Librería
   */
  function setupCatalogFilters() {
    const searchInput = document.getElementById('stationery-search-input');
    const tabButtons = document.querySelectorAll('[data-stationery-tab]');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderDynamicStationeryGrid();
      });
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => {
          b.classList.remove('bg-brand-cyan', 'text-[#0B0F19]', 'shadow-md');
          b.classList.add('bg-[#111827]', 'text-slate-300');
        });

        btn.classList.remove('bg-[#111827]', 'text-slate-300');
        btn.classList.add('bg-brand-cyan', 'text-[#0B0F19]', 'shadow-md');

        const tab = btn.getAttribute('data-stationery-tab');
        if (tab === 'comercial') currentCategory = 'Librería Comercial';
        else if (tab === 'escolar') currentCategory = 'Librería Escolar';
        else if (tab === 'tecnica' || tab === 'imprenta') currentCategory = 'Servicios de Imprenta';
        else currentCategory = 'all';

        renderDynamicStationeryGrid();
      });
    });
  }

  /**
   * Renderiza las tarjetas en la grilla de Librería (#stationery-products-grid)
   */
  function renderDynamicStationeryGrid() {
    const container = document.getElementById('stationery-products-grid');
    if (!container) return;

    if (!dynamicProducts || dynamicProducts.length === 0) return;

    // Filtrar según categoría seleccionada y búsqueda
    let filtered = dynamicProducts;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.categoria === currentCategory);
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
        <div class="col-span-full py-12 text-center bg-[#111827] rounded-2xl border border-[#1F2937] p-8">
          <svg class="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-base font-semibold text-white">No encontramos productos en esta categoría.</p>
          <p class="text-xs text-slate-400 mt-1">¡Consultanos directamente por WhatsApp! Disponemos de amplio stock en el local.</p>
          <a href="https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent('Hola Librería Universal! Busco un artículo:')}" 
             target="_blank" 
             class="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-emerald-600/20">
             Consultar por Mensaje de WhatsApp
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
    if (product.categoria === 'Insumos / Otros') categoryBadgeClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/30';

    const imgUrl = product.imagen_url || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80';

    card.innerHTML = `
      <div>
        <!-- Foto del Producto con efecto hover -->
        <div class="w-full h-44 rounded-xl bg-[#0B0E14] border border-[#1F2937] mb-4 overflow-hidden relative">
          <img src="${imgUrl}" alt="${escapeHTML(product.nombre)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80'" />
          
          ${product.destacado ? `
            <span class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-brand-magenta text-white shadow-md">
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

      <!-- Footer de Tarjeta: Precio y Botón WhatsApp -->
      <div class="pt-4 border-t border-[#1F2937] flex items-center justify-between gap-3">
        <div>
          <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-body">Precio</span>
          <span class="font-mono font-bold ${hasPrice ? 'text-white text-base' : 'text-brand-yellow text-xs'}">
            ${priceFormatted}
          </span>
        </div>

        <!-- Botón Consultar por WhatsApp Requerido -->
        <a href="${waUrl}" target="_blank" 
           class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-[#159A5C] hover:bg-[#12804d] text-white rounded-lg shadow-md hover:shadow-emerald-900/30 transition-all duration-200 flex-shrink-0"
           title="Consultar por WhatsApp">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.174.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/>
          </svg>
          <span>WhatsApp</span>
        </a>
      </div>
    `;

    return card;
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
    getProducts: () => dynamicProducts
  };
})();
