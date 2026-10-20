/**
 * LIBRERÍA UNIVERSAL - MÓDULO DE CARRITO DE COMPRAS & PEDIDOS UNIFICADOS (cart.js)
 * Permite agregar productos del catálogo y sellos personalizados del diseñador
 * para consolidar todo el pedido en un solo mensaje de WhatsApp.
 * Cumple 100% con CSP (sin inline scripts, sin eval) y sanitización anti-XSS.
 */

(function () {
  'use strict';

  const BUSINESS_PHONE = '5491126097125';
  const BUSINESS_NAME = 'Librería Universal';
  const STORAGE_KEY = 'lu_cart_items_v1';

  // Estado reactivo del carrito
  const cartState = {
    items: [],
    customerName: '',
    customerNotes: ''
  };

  /**
   * Función de escape contextual para prevenir XSS
   */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Formatea valores numéricos en formato de moneda argentina
   */
  function formatMoney(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return 'A cotizar';
    return `$ ${amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Carga los ítems guardados en localStorage
   */
  function loadCartFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          cartState.items = parsed.filter(item => item && item.id && item.name);
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar el carrito del almacenamiento local:', e.message);
      cartState.items = [];
    }
  }

  /**
   * Guarda los ítems actuales en localStorage
   */
  function saveCartToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartState.items));
    } catch (e) {
      console.warn('No se pudo guardar el carrito en almacenamiento local:', e.message);
    }
  }

  /**
   * Notificación flotante (Toast)
   */
  function showCartToast(message) {
    let toast = document.getElementById('toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notification';
      toast.className = 'fixed bottom-24 right-6 z-50 bg-[#121826] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium border border-brand-cyan/40 opacity-0 transform translate-y-4 pointer-events-none transition-all duration-300';
      document.body.appendChild(toast);
    }

    toast.replaceChildren();

    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('class', 'w-5 h-5 text-brand-cyan flex-shrink-0');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M5 13l4 4L19 7');
    iconSvg.appendChild(path);

    const textSpan = document.createElement('span');
    textSpan.className = 'font-body text-xs sm:text-sm';
    textSpan.textContent = String(message);

    toast.appendChild(iconSvg);
    toast.appendChild(textSpan);

    toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    }, 2800);
  }

  /**
   * Actualiza los contadores de badges en el navbar y botón flotante
   */
  function updateCartBadges() {
    const totalCount = cartState.items.reduce((acc, item) => acc + (item.quantity || 1), 0);
    
    const badges = [
      document.getElementById('nav-cart-badge'),
      document.getElementById('mobile-cart-badge'),
      document.getElementById('floating-cart-badge'),
      document.getElementById('cart-header-count')
    ];

    badges.forEach(badge => {
      if (badge) {
        badge.textContent = String(totalCount);
        // Animación bump
        badge.classList.remove('scale-125');
        void badge.offsetWidth; // trigger reflow
        badge.classList.add('scale-125');
        setTimeout(() => badge.classList.remove('scale-125'), 200);
      }
    });

    // Controlar visibilidad del botón flotante si se desea resaltar
    const floatingBtn = document.getElementById('floating-cart-btn');
    if (floatingBtn) {
      if (totalCount > 0) {
        floatingBtn.classList.add('animate-bounce-subtle');
      } else {
        floatingBtn.classList.remove('animate-bounce-subtle');
      }
    }
  }

  /**
   * Renderiza el contenido del Drawer del Carrito
   */
  function renderCartDrawer() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const quoteNoticeEl = document.getElementById('cart-quote-notice');
    const sendBtn = document.getElementById('cart-send-whatsapp-btn');
    const clearBtn = document.getElementById('cart-clear-btn');

    if (!container) return;

    container.replaceChildren();

    if (cartState.items.length === 0) {
      // Estado Carrito Vacío
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'py-16 text-center text-slate-400 space-y-4';
      emptyDiv.innerHTML = `
        <div class="w-16 h-16 mx-auto rounded-2xl bg-[#111827] border border-[#1F2937] flex items-center justify-center text-slate-500 shadow-inner">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h4 class="text-base font-bold text-white font-display">Tu carrito está vacío</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-body">
            Agregá artículos de librería desde el catálogo o personalizá tu sello en el diseñador en vivo.
          </p>
        </div>
        <button type="button" id="cart-empty-explore-btn" class="inline-flex items-center gap-2 px-4 py-2 bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30 rounded-xl text-xs font-bold transition">
          <span>Explorar Catálogo</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </button>
      `;

      const exploreBtn = emptyDiv.querySelector('#cart-empty-explore-btn');
      if (exploreBtn) {
        exploreBtn.addEventListener('click', () => {
          closeCartDrawer();
          const target = document.getElementById('libreria') || document.getElementById('cotizador-sellos');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
      }

      container.appendChild(emptyDiv);

      if (subtotalEl) subtotalEl.textContent = '$ 0,00';
      if (quoteNoticeEl) quoteNoticeEl.classList.add('hidden');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add('opacity-50', 'pointer-events-none');
      }
      if (clearBtn) clearBtn.classList.add('hidden');
      return;
    }

    // Si tiene ítems, habilitar botones
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('opacity-50', 'pointer-events-none');
    }
    if (clearBtn) clearBtn.classList.remove('hidden');

    let totalAmount = 0;
    let hasQuotedItems = false;

    // Renderizar cada ítem del carrito
    cartState.items.forEach((item, index) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'p-3.5 bg-[#111827] border border-[#1F2937] hover:border-slate-700 rounded-xl flex items-start gap-3 relative transition shadow-sm';

      const isStamp = item.type === 'stamp';
      const itemPrice = typeof item.price === 'number' ? item.price : null;
      const subtotalItem = itemPrice !== null ? itemPrice * item.quantity : null;

      if (subtotalItem !== null) {
        totalAmount += subtotalItem;
      } else {
        hasQuotedItems = true;
      }

      const formattedSubtotal = subtotalItem !== null ? formatMoney(subtotalItem) : 'A cotizar';

      // Thumbnail
      let thumbHtml = '';
      if (isStamp) {
        thumbHtml = `
          <div class="w-16 h-16 rounded-lg bg-brand-purple/10 border border-brand-purple/30 p-2 flex flex-col items-center justify-center flex-shrink-0 text-purple-300">
            <span class="text-xl">🔤</span>
            <span class="text-[9px] font-extrabold uppercase tracking-widest text-brand-cyan mt-0.5">SELLO</span>
          </div>
        `;
      } else {
        const imgSrc = item.image || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&auto=format&fit=crop&q=80';
        thumbHtml = `
          <div class="w-16 h-16 rounded-lg bg-white p-1 flex items-center justify-center flex-shrink-0 border border-slate-200/80 overflow-hidden shadow-sm">
            <img src="${imgSrc}" alt="${escapeHTML(item.name)}" class="max-w-full max-h-full object-contain" />
          </div>
        `;
      }

      // Detalles específicos si es sello
      let stampDetailsHtml = '';
      if (isStamp && item.stampDetails) {
        const d = item.stampDetails;
        const linesPreview = (d.lines || []).filter(l => l && l.trim()).join(' / ');
        stampDetailsHtml = `
          <div class="text-[10px] text-slate-400 space-y-0.5 my-1 font-body">
            <p class="text-purple-300 font-semibold">${escapeHTML(d.apparatus || 'Aparato')} • ${escapeHTML(d.orientation || 'Horizontal')}</p>
            ${d.drawing ? `<p class="text-emerald-400 font-medium">🧸 Dibujo: ${escapeHTML(d.drawing.name)} (${d.drawingPosition === 'left' ? 'Izq.' : 'Der.'})</p>` : ''}
            ${linesPreview ? `<p class="text-slate-500 italic line-clamp-1">"${escapeHTML(linesPreview)}"</p>` : ''}
          </div>
        `;
      }

      itemEl.innerHTML = `
        ${thumbHtml}
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-1">
            <h5 class="text-xs font-bold text-white font-display line-clamp-1">${escapeHTML(item.name)}</h5>
            <button type="button" class="btn-cart-remove text-slate-500 hover:text-rose-400 transition p-1" data-index="${index}" title="Eliminar ítem">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          
          <span class="inline-block text-[10px] font-semibold ${isStamp ? 'text-purple-300' : 'text-brand-cyan'} mb-0.5 font-body">
            ${escapeHTML(item.category || (isStamp ? 'Sello Personalizado' : 'Librería'))}
          </span>

          ${stampDetailsHtml}

          <div class="flex items-center justify-between mt-1 pt-1 border-t border-[#1F2937]/70">
            <!-- Selector de Cantidad -->
            <div class="inline-flex items-center border border-[#1F2937] rounded-lg bg-[#0B0F19] overflow-hidden">
              <button type="button" class="btn-cart-qty px-2.5 py-0.5 text-slate-400 hover:text-white hover:bg-[#1F2937] transition text-xs font-bold" data-index="${index}" data-delta="-1">−</button>
              <span class="px-2.5 py-0.5 text-xs font-mono font-bold text-white min-w-[24px] text-center">${item.quantity}</span>
              <button type="button" class="btn-cart-qty px-2.5 py-0.5 text-slate-400 hover:text-white hover:bg-[#1F2937] transition text-xs font-bold" data-index="${index}" data-delta="1">+</button>
            </div>

            <!-- Subtotal / Precio -->
            <div class="text-right">
              <span class="text-xs font-mono font-bold ${subtotalItem !== null ? 'text-white' : 'text-brand-yellow'}">
                ${formattedSubtotal}
              </span>
              ${itemPrice !== null && item.quantity > 1 ? `
                <span class="block text-[10px] font-mono text-slate-400">${formatMoney(itemPrice)} c/u</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // Event listeners para eliminar y cambiar cantidad
      const btnRemove = itemEl.querySelector('.btn-cart-remove');
      if (btnRemove) {
        btnRemove.addEventListener('click', () => {
          removeItemFromCart(index);
        });
      }

      const qtyBtns = itemEl.querySelectorAll('.btn-cart-qty');
      qtyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const delta = parseInt(btn.getAttribute('data-delta'), 10) || 0;
          updateItemQuantity(index, delta);
        });
      });

      container.appendChild(itemEl);
    });

    // Actualizar Subtotal y avisos
    if (subtotalEl) {
      subtotalEl.textContent = formatMoney(totalAmount);
    }
    if (quoteNoticeEl) {
      if (hasQuotedItems) {
        quoteNoticeEl.classList.remove('hidden');
      } else {
        quoteNoticeEl.classList.add('hidden');
      }
    }
  }

  /**
   * Agrega un ítem al carrito
   */
  function addItemToCart(item) {
    if (!item || !item.name) return;

    // Si es producto de catálogo, agrupar si ya existe el mismo ID
    if (item.type === 'product' && item.productId) {
      const existing = cartState.items.find(i => i.type === 'product' && i.productId === item.productId);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
        saveCartToStorage();
        updateCartBadges();
        renderCartDrawer();
        showCartToast(`¡"${item.name}" actualizado en el carrito! (${existing.quantity} un.)`);
        return;
      }
    }

    // Si es sello o producto nuevo, agregar como ítem nuevo
    const newItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: item.productId || null,
      type: item.type || 'product',
      name: item.name,
      price: typeof item.price === 'number' ? item.price : null,
      priceFormatted: item.priceFormatted || (typeof item.price === 'number' ? formatMoney(item.price) : 'A cotizar'),
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      image: item.image || '',
      category: item.category || '',
      stampDetails: item.stampDetails || null
    };

    cartState.items.push(newItem);
    saveCartToStorage();
    updateCartBadges();
    renderCartDrawer();

    const toastLabel = newItem.type === 'stamp' ? 'Sello personalizado' : `"${newItem.name}"`;
    showCartToast(`¡${toastLabel} agregado al carrito!`);
  }

  /**
   * Elimina un ítem del carrito por índice
   */
  function removeItemFromCart(index) {
    if (index >= 0 && index < cartState.items.length) {
      const removed = cartState.items.splice(index, 1)[0];
      saveCartToStorage();
      updateCartBadges();
      renderCartDrawer();
      if (removed) {
        showCartToast(`"${removed.name}" eliminado del carrito.`);
      }
    }
  }

  /**
   * Actualiza la cantidad de un ítem
   */
  function updateItemQuantity(index, delta) {
    if (index >= 0 && index < cartState.items.length) {
      const item = cartState.items[index];
      const newQty = (item.quantity || 1) + delta;
      if (newQty <= 0) {
        removeItemFromCart(index);
      } else {
        item.quantity = newQty;
        saveCartToStorage();
        updateCartBadges();
        renderCartDrawer();
      }
    }
  }

  /**
   * Vacía completamente el carrito
   */
  function clearCart() {
    if (cartState.items.length === 0) return;
    if (confirm('¿Desea vaciar todos los productos y sellos de su carrito?')) {
      cartState.items = [];
      saveCartToStorage();
      updateCartBadges();
      renderCartDrawer();
      showCartToast('El carrito fue vaciado.');
    }
  }

  /**
   * Abre el Drawer lateral del carrito
   */
  function openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-drawer-panel');
    if (!drawer || !panel) return;

    renderCartDrawer();

    drawer.classList.remove('hidden');
    // Permitir reflow antes de animar
    void drawer.offsetWidth;
    drawer.classList.remove('opacity-0');
    drawer.classList.add('opacity-100');
    panel.classList.remove('translate-x-full');
    panel.classList.add('translate-x-0');

    document.body.classList.add('overflow-hidden');
  }

  /**
   * Cierra el Drawer lateral del carrito
   */
  function closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const panel = document.getElementById('cart-drawer-panel');
    if (!drawer || !panel) return;

    drawer.classList.remove('opacity-100');
    drawer.classList.add('opacity-0');
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');

    setTimeout(() => {
      drawer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 280);
  }

  /**
   * Genera y abre el mensaje completo unificado de WhatsApp
   */
  function sendUnifiedWhatsAppOrder() {
    if (cartState.items.length === 0) {
      showCartToast('Agregue productos a su carrito antes de enviar el pedido.');
      return;
    }

    const customerNameInput = document.getElementById('cart-customer-name');
    const customerNotesInput = document.getElementById('cart-customer-notes');

    const customerName = customerNameInput ? customerNameInput.value.trim() : '';
    const customerNotes = customerNotesInput ? customerNotesInput.value.trim() : '';

    let totalAmount = 0;
    let hasQuotedItems = false;

    let itemsText = '';

    cartState.items.forEach((item, index) => {
      const num = index + 1;
      const isStamp = item.type === 'stamp';
      const itemPrice = typeof item.price === 'number' ? item.price : null;
      const subtotalItem = itemPrice !== null ? itemPrice * item.quantity : null;

      if (subtotalItem !== null) {
        totalAmount += subtotalItem;
      } else {
        hasQuotedItems = true;
      }

      if (isStamp && item.stampDetails) {
        const d = item.stampDetails;
        itemsText += `${num}️⃣ *${item.name}*\n`;
        itemsText += `   • Cantidad: ${item.quantity}\n`;
        itemsText += `   • Aparato: ${d.apparatus || 'Automático'}\n`;
        itemsText += `   • Orientación: ${d.orientation || 'Horizontal'}\n`;
        itemsText += `   • Tinta: ${d.inkColor || 'Negra'}\n`;
        if (d.drawing) {
          itemsText += `   • Dibujo: #${d.drawing.code} - ${d.drawing.name} (${d.drawingPosition === 'left' ? 'A la Izquierda' : 'A la Derecha'})\n`;
        }
        if (d.lines && d.lines.length > 0) {
          itemsText += `   • Texto configurado:\n`;
          d.lines.forEach((line, lIdx) => {
            const fontName = (d.fonts && d.fonts[lIdx]) ? d.fonts[lIdx].replace('font-stamp-', 'Tipo ') : 'Tipografía Estándar';
            itemsText += `     - Línea ${lIdx + 1}: "${line || '(Vacía)'}" [${fontName}]\n`;
          });
        }
        itemsText += `   • Precio: A cotizar\n\n`;
      } else {
        itemsText += `${num}️⃣ *${item.name}*\n`;
        itemsText += `   • Cantidad: ${item.quantity}\n`;
        itemsText += `   • Categoría: ${item.category || 'Librería'}\n`;
        if (itemPrice !== null) {
          itemsText += `   • Precio unitario: ${formatMoney(itemPrice)}\n`;
          itemsText += `   • Subtotal: ${formatMoney(subtotalItem)}\n\n`;
        } else {
          itemsText += `   • Precio: Consultar presupuesto\n\n`;
        }
      }
    });

    let totalStr = formatMoney(totalAmount);
    if (hasQuotedItems) {
      totalStr += ' (+ ítems a cotizar)';
    }

    // Armado del mensaje completo
    let message = `👋 ¡Hola *${BUSINESS_NAME}*! Quiero encargar el siguiente *Pedido Unificado* desde la web:\n\n`;
    message += `🛍️ *DETALLE DE LOS PRODUCTOS (${cartState.items.length} ítems):*\n`;
    message += `────────────────────────────\n`;
    message += `${itemsText}`;
    message += `────────────────────────────\n`;
    message += `💰 *TOTAL ESTIMADO:* ${totalStr}\n\n`;

    if (customerName) {
      message += `👤 *Cliente:* ${customerName}\n`;
    }
    if (customerNotes) {
      message += `📝 *Aclaraciones / Retiro:* ${customerNotes}\n`;
    }

    message += `\n¿Me confirman disponibilidad y plazo de entrega para retirar por el local de Valentín Alsina? ¡Muchas gracias!`;

    const cleanPhone = BUSINESS_PHONE.replace(/[^\d]/g, '');
    const encodedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(encodedUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Inicialización de eventos del Carrito
   */
  function initCart() {
    loadCartFromStorage();
    updateCartBadges();

    // Botones para abrir el carrito
    const openBtns = [
      document.getElementById('nav-cart-btn'),
      document.getElementById('mobile-cart-btn'),
      document.getElementById('floating-cart-btn')
    ];

    openBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          openCartDrawer();
        });
      }
    });

    // Botón para cerrar el carrito
    const closeBtn = document.getElementById('cart-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCartDrawer);
    }

    // Cerrar al hacer clic en el backdrop exterior
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
          closeCartDrawer();
        }
      });
    }

    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && !drawer.classList.contains('hidden')) {
        closeCartDrawer();
      }
    });

    // Botón Vaciar Carrito
    const clearBtn = document.getElementById('cart-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearCart);
    }

    // Botón Mandar Pedido por WhatsApp
    const sendBtn = document.getElementById('cart-send-whatsapp-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', sendUnifiedWhatsAppOrder);
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
  } else {
    initCart();
  }

  // Exponer API global segura para integración con catálogo y diseñador de sellos
  window.LibreriaCart = Object.freeze({
    addItem: addItemToCart,
    removeItem: removeItemFromCart,
    updateQuantity: updateItemQuantity,
    clear: clearCart,
    open: openCartDrawer,
    close: closeCartDrawer,
    getItems: () => [...cartState.items],
    getCount: () => cartState.items.reduce((acc, item) => acc + (item.quantity || 1), 0),
    showToast: showCartToast
  });

})();
