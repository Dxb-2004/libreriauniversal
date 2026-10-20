/**
 * LIBRERÍA UNIVERSAL - CONTROLADOR DEL PANEL DE ADMINISTRACIÓN (CRUD)
 * Arquitectura modular y reactiva basada en tesla-computacion.
 */

// Estado global reactivo del panel admin
const adminState = {
  products: [],
  filteredProducts: [],
  files: [],
  categories: [
    'Librería Comercial',
    'Librería Escolar',
    'Servicios de Imprenta',
    'Sellos',
    'Sellos de corrección docente',
    'Insumos / Otros'
  ],
  currentEditId: null,
  deleteTargetId: null,
  activeTab: 'products',
  filters: {
    search: '',
    category: 'Todas',
    stock: 'todos'
  },
  user: null,
  token: null
};

// =============================================================================
// 1. INICIALIZACIÓN Y PROTECCIÓN DE SESIÓN
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar credenciales almacenadas (soporta sessionStorage y localStorage)
  const token = sessionStorage.getItem('lu_admin_token') || localStorage.getItem('lu_admin_token');
  const storedUser = sessionStorage.getItem('lu_admin_user') || localStorage.getItem('lu_admin_user');

  if (!token || !storedUser) {
    window.location.replace('login.html');
    return;
  }

  try {
    adminState.user = JSON.parse(storedUser);
    adminState.token = token;

    // Mostrar email en el header
    const emailEl = document.getElementById('header-user-email');
    if (emailEl && adminState.user.email) {
      emailEl.textContent = adminState.user.email;
    }
  } catch (e) {
    logout();
    return;
  }

  // 2. Validar sesión viva en el servidor (/api/auth/me)
  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });

    if (!res.ok) {
      throw new Error('Sesión expirada');
    }

    const authData = await res.json();
    if (!authData.authenticated || authData.user?.role !== 'admin') {
      throw new Error('Permisos insuficientes');
    }
  } catch (err) {
    console.warn('Fallo de validación de sesión:', err.message);
    logout();
    return;
  }

  // 3. Inicializar eventos y cargar catálogo y archivos
  initEventListeners();
  await Promise.all([
    loadProducts(),
    loadFiles()
  ]);
});

// =============================================================================
// 2. GESTIÓN DE EVENTOS DE INTERFAZ
// =============================================================================
function initEventListeners() {
  // Pestañas Principales (Catálogo vs Archivos & Catálogos)
  const tabBtnProducts = document.getElementById('tab-btn-products');
  const tabBtnFiles = document.getElementById('tab-btn-files');
  if (tabBtnProducts) tabBtnProducts.addEventListener('click', () => switchTab('products'));
  if (tabBtnFiles) tabBtnFiles.addEventListener('click', () => switchTab('files'));

  // Gestión de Archivos & Catálogos
  const btnRefreshFiles = document.getElementById('btn-refresh-files');
  if (btnRefreshFiles) btnRefreshFiles.addEventListener('click', () => loadFiles(true));

  const fileInputUpload = document.getElementById('file-input-upload');
  const fileUploadForm = document.getElementById('file-upload-form');
  const selectedFileLabel = document.getElementById('selected-file-label');
  const btnUploadSubmit = document.getElementById('btn-upload-file-submit');

  if (fileInputUpload) {
    fileInputUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFileLabel.textContent = `Archivo seleccionado: ${file.name} (${formatBytes(file.size)})`;
        selectedFileLabel.classList.remove('hidden');
        btnUploadSubmit.disabled = false;
        btnUploadSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        selectedFileLabel.textContent = '';
        selectedFileLabel.classList.add('hidden');
        btnUploadSubmit.disabled = true;
        btnUploadSubmit.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });
  }

  if (fileUploadForm) {
    fileUploadForm.addEventListener('submit', handleUploadFile);
  }

  // Botón Cerrar Sesión Individual
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Botón Desloguear Todos los Dispositivos Conectados
  const btnLogoutAll = document.getElementById('btn-logout-all');
  if (btnLogoutAll) {
    btnLogoutAll.addEventListener('click', async () => {
      const confirmLogout = confirm('¿Estás seguro de que deseas cerrar la sesión en TODOS los dispositivos y navegadores conectados? Tendrás que volver a ingresar tu contraseña.');
      if (!confirmLogout) return;

      try {
        await fetch('/api/auth/logout-all', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminState.token}`
          }
        });
      } catch (e) {
        // Continuar con limpieza
      }

      sessionStorage.removeItem('lu_admin_token');
      sessionStorage.removeItem('lu_admin_user');
      localStorage.removeItem('lu_admin_token');
      localStorage.removeItem('lu_admin_user');
      window.location.replace('login.html');
    });
  }

  // Botón Abrir Modal de Creación
  document.getElementById('btn-open-create-modal').addEventListener('click', openCreateModal);

  // Botón Vaciar Catálogo Completo
  const btnClearCatalog = document.getElementById('btn-clear-catalog');
  if (btnClearCatalog) {
    btnClearCatalog.addEventListener('click', handleClearCatalog);
  }

  // Cerrar y Cancelar Modal
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);

  // Formulario Guardar Producto
  document.getElementById('product-form').addEventListener('submit', handleSaveProduct);

  // Modal de Eliminación
  document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
  document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);

  // Filtros reactivos
  document.getElementById('search-filter').addEventListener('input', (e) => {
    adminState.filters.search = e.target.value.toLowerCase().trim();
    applyFilters();
  });

  document.getElementById('category-filter').addEventListener('change', (e) => {
    adminState.filters.category = e.target.value;
    applyFilters();
  });

  document.getElementById('stock-filter').addEventListener('change', (e) => {
    adminState.filters.stock = e.target.value;
    applyFilters();
  });

  // Checkbox Consultar Presupuesto
  const checkConsultar = document.getElementById('form-consultar-precio');
  const precioInput = document.getElementById('form-precio');
  checkConsultar.addEventListener('change', () => {
    if (checkConsultar.checked) {
      precioInput.value = '0';
      precioInput.disabled = true;
    } else {
      precioInput.disabled = false;
      precioInput.focus();
    }
  });

  // Manejo de Imagen: Subida de archivo o pegado de URL
  const fileInput = document.getElementById('form-image-file');
  const urlInput = document.getElementById('form-image-url');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validación previa de tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('El archivo supera el límite de 5 MB', 'error');
      fileInput.value = '';
      return;
    }

    // Previsualización instantánea en Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      updateImagePreview(event.target.result);
      // Pre-cargar la imagen en urlInput para que siempre se guarde incluso si la red o API fallan
      if (!urlInput.value || urlInput.value.startsWith('data:')) {
        urlInput.value = event.target.result;
      }
    };
    reader.readAsDataURL(file);

    // Subida al servidor mediante el endpoint blindado
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document', file);

    try {
      showToast('Subiendo archivo al servidor...', 'info');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminState.token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && data.file?.url) {
        urlInput.value = data.file.url;
        showToast('Imagen verificada y subida con éxito', 'success');
      } else {
        console.warn('Aviso al subir imagen remota:', data.message);
      }
    } catch (err) {
      console.warn('Error al subir imagen remota, se conservará la versión local:', err);
    }
  });

  urlInput.addEventListener('input', (e) => {
    updateImagePreview(e.target.value.trim());
  });

  // Modal Cambiar Contraseña de Administrador (Bcrypt costo 12)
  const pwdModal = document.getElementById('password-modal');
  const btnOpenPwd = document.getElementById('btn-open-password-modal');
  const btnClosePwd = document.getElementById('btn-close-password-modal');
  const btnCancelPwd = document.getElementById('btn-cancel-pwd');
  const changePwdForm = document.getElementById('change-password-form');
  const pwdErrorAlert = document.getElementById('pwd-error-alert');

  if (btnOpenPwd && pwdModal) {
    btnOpenPwd.addEventListener('click', () => {
      if (pwdErrorAlert) {
        pwdErrorAlert.classList.add('hidden');
        pwdErrorAlert.textContent = '';
      }
      if (changePwdForm) changePwdForm.reset();
      pwdModal.classList.remove('hidden');
      pwdModal.classList.add('flex');
      const currInput = document.getElementById('input-curr-pwd');
      if (currInput) currInput.focus();
    });
  }

  const closePwdModal = () => {
    if (!pwdModal) return;
    pwdModal.classList.add('hidden');
    pwdModal.classList.remove('flex');
    if (changePwdForm) changePwdForm.reset();
  };

  if (btnClosePwd) btnClosePwd.addEventListener('click', closePwdModal);
  if (btnCancelPwd) btnCancelPwd.addEventListener('click', closePwdModal);

  if (changePwdForm) {
    changePwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (pwdErrorAlert) pwdErrorAlert.classList.add('hidden');

      const currentPassword = document.getElementById('input-curr-pwd').value;
      const newPassword = document.getElementById('input-new-pwd').value;
      const confirmPassword = document.getElementById('input-confirm-pwd').value;

      if (newPassword !== confirmPassword) {
        pwdErrorAlert.textContent = 'La nueva contraseña y su confirmación no coinciden.';
        pwdErrorAlert.classList.remove('hidden');
        return;
      }

      if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        pwdErrorAlert.textContent = 'La nueva contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número.';
        pwdErrorAlert.classList.remove('hidden');
        return;
      }

      const submitBtn = document.getElementById('btn-submit-pwd');
      const btnText = document.getElementById('pwd-btn-text');
      const spinner = document.getElementById('pwd-spinner');

      submitBtn.disabled = true;
      btnText.textContent = 'Encriptando y guardando...';
      spinner.classList.remove('hidden');

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminState.token}`
          },
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Error al actualizar contraseña.');
        }

        // Actualizar token en memoria y sesión
        if (data.token) {
          adminState.token = data.token;
          sessionStorage.setItem('lu_admin_token', data.token);
          localStorage.setItem('lu_admin_token', data.token);
        }

        closePwdModal();
        showToast('¡Contraseña actualizada y encriptada exitosamente con Bcrypt (costo 12)!', 'success');
      } catch (err) {
        if (pwdErrorAlert) {
          pwdErrorAlert.textContent = err.message || 'Error al cambiar contraseña.';
          pwdErrorAlert.classList.remove('hidden');
        }
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Actualizar y Encriptar';
        spinner.classList.add('hidden');
      }
    });
  }
}

/**
 * Actualiza el contenedor de previsualización de imagen del modal
 */
function updateImagePreview(src) {
  const previewImg = document.getElementById('form-image-preview');
  const placeholder = document.getElementById('form-image-placeholder');

  if (src) {
    previewImg.src = src;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    previewImg.src = '';
    previewImg.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }
}

// =============================================================================
// 3. CARGA Y SINCRONIZACIÓN DE PRODUCTOS (API REST)
// =============================================================================
async function loadProducts() {
  try {
    const res = await fetch('/api/products?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al obtener productos');
    }

    adminState.products = data.products || [];
    applyFilters();
    updateDashboardStats();
  } catch (err) {
    console.error('Error al cargar productos:', err);
    showToast('Error al conectar con la base de datos de productos', 'error');
  }
}

/**
 * Filtra los productos en memoria y renderiza la tabla
 */
function applyFilters() {
  const { search, category, stock } = adminState.filters;

  adminState.filteredProducts = adminState.products.filter(p => {
    // Filtro búsqueda
    const matchesSearch = !search || 
      (p.nombre && p.nombre.toLowerCase().includes(search)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search)) ||
      (p.categoria && p.categoria.toLowerCase().includes(search));

    // Filtro categoría
    const matchesCategory = category === 'Todas' || p.categoria === category;

    // Filtro stock
    let matchesStock = true;
    if (stock === 'en_stock') matchesStock = p.stock === true;
    if (stock === 'sin_stock') matchesStock = p.stock === false;

    return matchesSearch && matchesCategory && matchesStock;
  });

  document.getElementById('filtered-count').textContent = adminState.filteredProducts.length;
  renderProductsTable();
}

/**
 * Actualiza las estadísticas superiores del Dashboard
 */
function updateDashboardStats() {
  const total = adminState.products.length;
  const inStock = adminState.products.filter(p => p.stock === true).length;
  const outOfStock = total - inStock;
  const featured = adminState.products.filter(p => p.destacado === true).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-in-stock').textContent = inStock;
  document.getElementById('stat-out-of-stock').textContent = outOfStock;
  document.getElementById('stat-featured').textContent = featured;

  // Actualizar barras proporcionales
  if (total > 0) {
    const stockPercent = Math.round((inStock / total) * 100);
    const outPercent = 100 - stockPercent;
    document.getElementById('stat-stock-bar').style.width = `${stockPercent}%`;
    document.getElementById('stat-out-stock-bar').style.width = `${outPercent}%`;
  }
}

// =============================================================================
// 4. RENDERIZADO DE LA TABLA CRUD
// =============================================================================
function renderProductsTable() {
  const tbody = document.getElementById('products-table-body');
  tbody.innerHTML = '';

  if (adminState.filteredProducts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-500">
          <svg class="w-12 h-12 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
          <p class="text-sm font-semibold text-slate-300">No se encontraron productos con los filtros seleccionados.</p>
          <p class="text-xs text-slate-500 mt-1">Prueba cambiando el término de búsqueda o categoría.</p>
        </td>
      </tr>
    `;
    return;
  }

  adminState.filteredProducts.forEach(product => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#0B0E14]/60 transition-colors group';

    // Badge de categoría con color distintivo
    const categoryBadge = getCategoryBadgeHTML(product.categoria);

    // Formato de precio
    const precioHTML = (!product.precio || Number(product.precio) === 0)
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 font-mono">A convenir</span>`
      : `<span class="font-mono font-bold text-white text-sm">$ ${Number(product.precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;

    // Miniatura con fallback elegante
    const imgUrl = product.imagen_url || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200&auto=format&fit=crop&q=80';

    tr.innerHTML = `
      <!-- Foto -->
      <td class="py-3 px-4">
        <div class="w-12 h-12 rounded-lg bg-[#0B0E14] border border-[#1E2638] overflow-hidden flex items-center justify-center p-0.5">
          <img src="${imgUrl}" alt="${escapeHTML(product.nombre)}" class="max-w-full max-h-full object-contain group-hover:scale-105 transition duration-200" onerror="this.src='https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200&auto=format&fit=crop&q=80'" />
        </div>
      </td>

      <!-- Nombre y Descripción -->
      <td class="py-3 px-4 max-w-xs">
        <div class="font-bold text-white text-sm leading-snug group-hover:text-brand-cyan transition">
          ${escapeHTML(product.nombre)}
        </div>
        <p class="text-xs text-slate-400 line-clamp-1 mt-0.5 font-light">
          ${escapeHTML(product.descripcion || 'Sin descripción adicional')}
        </p>
      </td>

      <!-- Categoría -->
      <td class="py-3 px-4 whitespace-nowrap">
        ${categoryBadge}
      </td>

      <!-- Precio -->
      <td class="py-3 px-4 whitespace-nowrap">
        ${precioHTML}
      </td>

      <!-- Toggle Stock -->
      <td class="py-3 px-4 text-center whitespace-nowrap">
        <button 
          type="button" 
          onclick="toggleProductStock('${product.id}')"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${product.stock ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' : 'bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 hover:bg-brand-yellow/25'}"
          title="Haga clic para cambiar disponibilidad"
        >
          <span class="w-1.5 h-1.5 rounded-full ${product.stock ? 'bg-emerald-400 animate-pulse' : 'bg-brand-yellow'}"></span>
          <span>${product.stock ? 'En Stock' : 'Por encargue'}</span>
        </button>
      </td>

      <!-- Destacado -->
      <td class="py-3 px-4 text-center whitespace-nowrap">
        ${product.destacado 
          ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-brand-magenta/15 text-brand-magenta border border-brand-magenta/30">★ Portada</span>`
          : `<span class="text-xs text-slate-600 font-mono">—</span>`
        }
      </td>

      <!-- Acciones: Editar (Amarillo) & Eliminar (Magenta) -->
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-2">
          
          <!-- Botón Editar -->
          <button 
            type="button" 
            onclick="openEditModal('${product.id}')"
            class="p-2 rounded-lg bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow hover:text-[#080B10] border border-brand-yellow/30 hover:border-brand-yellow transition duration-150"
            title="Editar producto"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>

          <!-- Botón Eliminar -->
          <button 
            type="button" 
            onclick="openDeleteModal('${product.id}', '${escapeHTML(product.nombre).replace(/'/g, "\\'")}')"
            class="p-2 rounded-lg bg-brand-magenta/10 text-brand-magenta hover:bg-brand-magenta hover:text-white border border-brand-magenta/30 hover:border-brand-magenta transition duration-150"
            title="Eliminar producto"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>

        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * Retorna badge estilizado por categoría
 */
function getCategoryBadgeHTML(categoria) {
  switch (categoria) {
    case 'Librería Comercial':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">Librería Comercial</span>`;
    case 'Librería Escolar':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Librería Escolar</span>`;
    case 'Servicios de Imprenta':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">Imprenta</span>`;
    case 'Sellos':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">Sellos</span>`;
    case 'Sellos de corrección docente':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-pink-500/15 text-pink-400 border border-pink-500/30">Sellos Docentes</span>`;
    case 'Insumos / Otros':
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">Insumos</span>`;
    default:
      return `<span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-700/50 text-slate-300">${categoria}</span>`;
  }
}

// =============================================================================
// 5. ACCIONES CRUD (CREAR, EDITAR, TOGGLE STOCK, ELIMINAR)
// =============================================================================

/**
 * Abre el modal para crear un nuevo producto
 */
function openCreateModal() {
  adminState.currentEditId = null;
  document.getElementById('modal-title').textContent = 'Nuevo Producto / Servicio';
  document.getElementById('save-btn-text').textContent = 'Guardar y Publicar';
  document.getElementById('form-product-id').value = '';
  document.getElementById('form-nombre').value = '';
  document.getElementById('form-categoria').value = 'Librería Comercial';
  document.getElementById('form-precio').value = '';
  document.getElementById('form-precio').disabled = false;
  document.getElementById('form-consultar-precio').checked = false;
  document.getElementById('form-descripcion').value = '';
  document.getElementById('form-stock').checked = true;
  document.getElementById('form-destacado').checked = false;
  document.getElementById('form-image-url').value = '';
  document.getElementById('form-image-file').value = '';
  updateImagePreview('');

  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Abre el modal en modo edición con los datos del producto
 */
function openEditModal(id) {
  const product = adminState.products.find(p => p.id === id);
  if (!product) return;

  adminState.currentEditId = id;
  document.getElementById('modal-title').textContent = 'Editar Producto';
  document.getElementById('save-btn-text').textContent = 'Actualizar Cambios';
  document.getElementById('form-product-id').value = product.id;
  document.getElementById('form-nombre').value = product.nombre;
  document.getElementById('form-categoria').value = product.categoria;
  
  const isZeroPrice = !product.precio || Number(product.precio) === 0;
  document.getElementById('form-consultar-precio').checked = isZeroPrice;
  document.getElementById('form-precio').value = isZeroPrice ? '0' : product.precio;
  document.getElementById('form-precio').disabled = isZeroPrice;

  document.getElementById('form-descripcion').value = product.descripcion || '';
  document.getElementById('form-stock').checked = product.stock !== false;
  document.getElementById('form-destacado').checked = product.destacado === true;
  document.getElementById('form-image-url').value = product.imagen_url || '';
  document.getElementById('form-image-file').value = '';
  updateImagePreview(product.imagen_url || '');

  const modal = document.getElementById('product-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

/**
 * Cierra el modal de formulario
 */
function closeModal() {
  const modal = document.getElementById('product-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

/**
 * Procesa el guardado (Crear o Editar)
 */
async function handleSaveProduct(e) {
  e.preventDefault();

  const nombre = document.getElementById('form-nombre').value.trim();
  const categoria = document.getElementById('form-categoria').value;
  const consultarPrecio = document.getElementById('form-consultar-precio').checked;
  const precio = consultarPrecio ? 0 : parseFloat(document.getElementById('form-precio').value) || 0;
  const descripcion = document.getElementById('form-descripcion').value.trim();
  const stock = document.getElementById('form-stock').checked;
  const destacado = document.getElementById('form-destacado').checked;
  const imagen_url = document.getElementById('form-image-url').value.trim();

  if (!nombre) {
    showToast('El nombre del producto es obligatorio', 'error');
    return;
  }

  const payload = {
    nombre,
    categoria,
    precio,
    descripcion,
    imagen_url,
    stock,
    destacado
  };

  const isEditing = Boolean(adminState.currentEditId);
  const endpoint = isEditing ? `/api/products/${adminState.currentEditId}` : '/api/products';
  const method = isEditing ? 'PUT' : 'POST';

  const saveBtn = document.getElementById('btn-save-product');
  const btnText = document.getElementById('save-btn-text');
  const btnSpinner = document.getElementById('save-btn-spinner');

  saveBtn.disabled = true;
  btnText.textContent = 'Guardando...';
  btnSpinner.classList.remove('hidden');

  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminState.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al guardar el producto.');
    }

    showToast(isEditing ? 'Producto actualizado correctamente' : 'Producto creado exitosamente', 'success');
    closeModal();
    await loadProducts();

  } catch (err) {
    console.error('Error al guardar:', err);
    showToast(err.message || 'Error al conectar con el servidor', 'error');
  } finally {
    saveBtn.disabled = false;
    btnText.textContent = isEditing ? 'Actualizar Cambios' : 'Guardar y Publicar';
    btnSpinner.classList.add('hidden');
  }
}

/**
 * Alterna el stock con un solo clic desde la tabla
 */
async function toggleProductStock(id) {
  try {
    const res = await fetch(`/api/products/${id}/toggle-stock`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al cambiar stock');
    }

    // Actualizar estado local
    const p = adminState.products.find(item => item.id === id);
    if (p) {
      p.stock = data.stock;
      applyFilters();
      updateDashboardStats();
    }

    showToast(data.message, 'info');
  } catch (err) {
    showToast('No se pudo modificar la disponibilidad', 'error');
  }
}

/**
 * Modal de eliminación
 */
function openDeleteModal(id, nombre) {
  adminState.deleteTargetId = id;
  document.getElementById('delete-product-name').textContent = nombre;
  const modal = document.getElementById('delete-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeDeleteModal() {
  adminState.deleteTargetId = null;
  const modal = document.getElementById('delete-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function handleConfirmDelete() {
  if (!adminState.deleteTargetId) return;

  const btnConfirm = document.getElementById('btn-confirm-delete');
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'Eliminando...';

  try {
    const res = await fetch(`/api/products/${adminState.deleteTargetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al eliminar producto');
    }

    showToast('Producto eliminado del catálogo', 'magenta');
    closeDeleteModal();
    await loadProducts();
  } catch (err) {
    showToast(err.message || 'No se pudo eliminar el producto', 'error');
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = 'Sí, Eliminar';
  }
}

/**
 * Vacía todos los productos del catálogo para permitir carga limpia desde cero
 */
async function handleClearCatalog() {
  const confirmClear = confirm('⚠️ ¿Estás seguro de que deseas vaciar y eliminar TODOS los productos del catálogo?\n\nEsta acción te permitirá cargar tus productos desde cero sin los datos de muestra. ¿Deseas continuar?');
  if (!confirmClear) return;

  try {
    showToast('Vaciando catálogo...', 'info');
    const res = await fetch('/api/products', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'No se pudo vaciar el catálogo.');
    }

    showToast('Catálogo vaciado correctamente. Ya puedes cargar tus propios productos.', 'success');
    await loadProducts();
  } catch (err) {
    console.error('Error al vaciar catálogo:', err);
    showToast(err.message || 'Error al conectar con el servidor', 'error');
  }
}

// =============================================================================
// 6. CIERRE DE SESIÓN SEGURO
// =============================================================================
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Continuar con limpieza local
  }
  sessionStorage.removeItem('lu_admin_token');
  sessionStorage.removeItem('lu_admin_user');
  localStorage.removeItem('lu_admin_token');
  localStorage.removeItem('lu_admin_user');
  window.location.replace('login.html');
}

// =============================================================================
// 7. TOAST NOTIFICATIONS & UTILIDADES
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur-md border transition-all duration-300 transform translate-y-4 opacity-0';

  let borderColor = 'border-brand-cyan/40 bg-[#121722]/95 text-brand-cyan';
  if (type === 'success') borderColor = 'border-emerald-500/40 bg-[#121722]/95 text-emerald-400';
  if (type === 'error' || type === 'magenta') borderColor = 'border-brand-magenta/40 bg-[#121722]/95 text-brand-magenta';
  if (type === 'warning') borderColor = 'border-brand-yellow/40 bg-[#121722]/95 text-brand-yellow';

  toast.className += ` ${borderColor}`;
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 10);

  // Salida automática
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
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

// =============================================================================
// 8. CONTROLADOR DE PESTAÑAS (PRODUCTOS VS ARCHIVOS & CATÁLOGOS)
// =============================================================================
function switchTab(tab) {
  adminState.activeTab = tab;
  const viewProducts = document.getElementById('view-products');
  const viewFiles = document.getElementById('view-files');
  const btnProducts = document.getElementById('tab-btn-products');
  const btnFiles = document.getElementById('tab-btn-files');

  if (tab === 'products') {
    if (viewProducts) viewProducts.classList.remove('hidden');
    if (viewFiles) viewFiles.classList.add('hidden');
    if (btnProducts) {
      btnProducts.className = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-brand-cyan text-[#080B10] shadow-md shadow-brand-cyan/20 transition';
    }
    if (btnFiles) {
      btnFiles.className = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0B0E14] text-slate-400 hover:text-white border border-[#1E2638] hover:border-slate-600 transition';
    }
  } else {
    if (viewProducts) viewProducts.classList.add('hidden');
    if (viewFiles) viewFiles.classList.remove('hidden');
    if (btnFiles) {
      btnFiles.className = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-brand-cyan text-[#080B10] shadow-md shadow-brand-cyan/20 transition';
    }
    if (btnProducts) {
      btnProducts.className = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#0B0E14] text-slate-400 hover:text-white border border-[#1E2638] hover:border-slate-600 transition';
    }
  }
}

// =============================================================================
// 9. GESTIÓN DE ARCHIVOS & CATÁLOGOS (API REST Y VERCEL BLOB)
// =============================================================================
async function loadFiles(showToastFeedback = false) {
  try {
    const res = await fetch('/api/files?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al obtener la lista de archivos');
    }

    adminState.files = data.files || [];
    const countEl = document.getElementById('files-table-count');
    const badgeCountEl = document.getElementById('files-badge-count');
    if (countEl) countEl.textContent = adminState.files.length;
    if (badgeCountEl) badgeCountEl.textContent = adminState.files.length;

    renderFilesTable();

    if (showToastFeedback) {
      showToast('Lista de archivos actualizada', 'info');
    }
  } catch (err) {
    console.error('Error al cargar archivos:', err);
    showToast('Error al conectar con el servidor de archivos', 'error');
  }
}

function renderFilesTable() {
  const tbody = document.getElementById('files-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (adminState.files.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-500">
          <svg class="w-12 h-12 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <p class="text-sm font-semibold text-slate-300">No hay archivos ni catálogos subidos todavía.</p>
          <p class="text-xs text-slate-500 mt-1">Sube tu primer catálogo PDF o lista de precios arriba.</p>
        </td>
      </tr>
    `;
    return;
  }

  adminState.files.forEach(file => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#0B0E14]/60 transition-colors group';

    const iconHTML = getFileIconHTML(file.mimeType, file.name);
    const dateFormatted = file.created_at 
      ? new Date(file.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Reciente';

    tr.innerHTML = `
      <!-- Ícono Tipo -->
      <td class="py-3 px-4 text-center">
        ${iconHTML}
      </td>

      <!-- Nombre -->
      <td class="py-3 px-4 max-w-xs">
        <a href="${escapeHTML(file.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-white text-sm hover:text-brand-cyan transition truncate block" title="${escapeHTML(file.name)}">
          ${escapeHTML(file.name)}
        </a>
        <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(file.mimeType || 'Desconocido')}</span>
      </td>

      <!-- Tamaño -->
      <td class="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
        ${formatBytes(file.size)}
      </td>

      <!-- Fecha -->
      <td class="py-3 px-4 whitespace-nowrap text-xs text-slate-400 font-mono">
        ${dateFormatted}
      </td>

      <!-- Enlace Público / Copiar -->
      <td class="py-3 px-4 whitespace-nowrap">
        <button 
          type="button" 
          onclick="copyFileUrl('${escapeHTML(file.url)}')"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E14] text-brand-cyan hover:bg-brand-cyan hover:text-[#080B10] border border-brand-cyan/30 text-xs font-semibold transition"
          title="Copiar enlace para WhatsApp o web"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
          <span>Copiar Enlace</span>
        </button>
      </td>

      <!-- Acciones: Ver / Eliminar -->
      <td class="py-3 px-4 text-right whitespace-nowrap">
        <div class="inline-flex items-center gap-2">
          
          <!-- Ver / Abrir en pestaña nueva -->
          <a 
            href="${escapeHTML(file.url)}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="p-2 rounded-lg bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan hover:text-[#080B10] border border-brand-cyan/30 transition"
            title="Abrir archivo"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>

          <!-- Eliminar de la nube -->
          <button 
            type="button" 
            onclick="handleDeleteFile('${file.id}', '${escapeHTML(file.name).replace(/'/g, "\\'")}')"
            class="p-2 rounded-lg bg-brand-magenta/10 text-brand-magenta hover:bg-brand-magenta hover:text-white border border-brand-magenta/30 transition"
            title="Eliminar de la nube"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>

        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * Retorna ícono visual según el formato del archivo
 */
function getFileIconHTML(mimeType, filename) {
  const name = (filename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return `
      <div class="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold text-[10px]" title="PDF">
        PDF
      </div>
    `;
  }

  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/.test(name)) {
    return `
      <div class="w-8 h-8 rounded-lg bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan flex items-center justify-center font-bold text-[10px]" title="Imagen">
        IMG
      </div>
    `;
  }

  if (mime.includes('sheet') || mime.includes('excel') || /\.(xlsx?|csv)$/.test(name)) {
    return `
      <div class="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]" title="Excel">
        XLS
      </div>
    `;
  }

  if (mime.includes('word') || /\.(docx?)$/.test(name)) {
    return `
      <div class="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[10px]" title="Word">
        DOC
      </div>
    `;
  }

  return `
    <div class="w-8 h-8 rounded-lg bg-slate-700/50 border border-[#1E2638] text-slate-400 flex items-center justify-center font-bold text-[10px]" title="Archivo">
      DOC
    </div>
  `;
}

/**
 * Subida de archivos (PDFs, Catálogos, Documentos) a Vercel Blob
 */
async function handleUploadFile(e) {
  e.preventDefault();
  const fileInput = document.getElementById('file-input-upload');
  const file = fileInput ? fileInput.files[0] : null;

  if (!file) {
    showToast('Selecciona un archivo antes de presionar subir', 'warning');
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    showToast('El archivo supera el límite permitido de 25 MB', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-upload-file-submit');
  const spinner = document.getElementById('upload-file-spinner');
  const btnText = document.getElementById('upload-file-btn-text');

  submitBtn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Subiendo a la Nube...';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('document', file);
  formData.append('archivo', file);

  try {
    showToast('Subiendo archivo a la nube persistente...', 'info');
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al subir archivo');
    }

    showToast('¡Archivo subido exitosamente a la nube!', 'success');
    fileInput.value = '';
    const label = document.getElementById('selected-file-label');
    if (label) {
      label.textContent = '';
      label.classList.add('hidden');
    }
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    await loadFiles();
  } catch (err) {
    console.error('Error al subir archivo:', err);
    showToast(err.message || 'Error al conectar con el servidor', 'error');
  } finally {
    submitBtn.disabled = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Subir Archivo a la Nube';
  }
}

/**
 * Elimina un archivo de la nube
 */
async function handleDeleteFile(id, name) {
  const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar el archivo "${name}" de la nube? Esta acción no se puede deshacer.`);
  if (!confirmDelete) return;

  try {
    showToast('Eliminando archivo de la nube...', 'info');
    const res = await fetch(`/api/files/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminState.token}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Error al eliminar archivo');
    }

    showToast('Archivo eliminado de la nube', 'magenta');
    await loadFiles();
  } catch (err) {
    console.error('Error al borrar archivo:', err);
    showToast(err.message || 'No se pudo eliminar el archivo', 'error');
  }
}

/**
 * Copia URL pública del archivo al portapapeles
 */
function copyFileUrl(url) {
  if (!url) return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('¡Enlace copiado al portapapeles!', 'success'))
      .catch(() => fallbackCopyTextToClipboard(url));
  } else {
    fallbackCopyTextToClipboard(url);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('¡Enlace copiado al portapapeles!', 'success');
  } catch (err) {
    showToast('No se pudo copiar el enlace', 'error');
  }
  document.body.removeChild(textArea);
}

/**
 * Formatea bytes en KB, MB, etc.
 */
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
