-- =============================================================================
-- LIBRERÍA UNIVERSAL - POLÍTICAS ESTRICTAS DE ROW-LEVEL SECURITY (RLS)
-- Punto 4: user_id = auth.uid() obligatorio para lectura, inserción, actualización y borrado.
-- Punto 7: Prevención de IDOR a nivel de motor de base de datos.
-- Punto 8: Bloqueo de Mass Assignment (los usuarios no pueden alterar su rol).
-- =============================================================================

-- ==========================================
-- ACTIVACIÓN OBLIGATORIA DE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stamp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 1. POLÍTICAS PARA PROFILES
-- ==========================================

-- Lectura: Solo el usuario dueño de su perfil o personal administrativo
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid() OR
    (auth.jwt() ->> 'role') IN ('admin', 'staff')
);

-- Inserción: Solo el usuario autenticado para su propio ID
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
    id = auth.uid()
);

-- Actualización: Solo su propio perfil, pero SIN poder cambiar el campo 'role' (Punto 8)
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Impide escalamiento a admin
);

-- ==========================================
-- 2. POLÍTICAS PARA STAMP_ORDERS (PEDIDOS)
-- ==========================================

-- Lectura: Cada usuario ve SOLO sus propios pedidos (Anti-IDOR)
CREATE POLICY "stamp_orders_select_own"
ON public.stamp_orders
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role') IN ('admin', 'staff')
);

-- Inserción: Solo puede insertar con su propio user_id
CREATE POLICY "stamp_orders_insert_own"
ON public.stamp_orders
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- Actualización: Solo sus propios pedidos mientras estén en estado 'pending'
CREATE POLICY "stamp_orders_update_own"
ON public.stamp_orders
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() AND
    status = 'pending'
)
WITH CHECK (
    user_id = auth.uid()
);

-- Eliminación: Solo sus propios pedidos pendientes o admins
CREATE POLICY "stamp_orders_delete_own"
ON public.stamp_orders
FOR DELETE
TO authenticated
USING (
    (user_id = auth.uid() AND status = 'pending') OR
    (auth.jwt() ->> 'role') = 'admin'
);

-- ==========================================
-- 3. POLÍTICAS PARA CONTACT_MESSAGES
-- ==========================================

-- Inserción: Permitida para usuarios anónimos o autenticados (formulario público con bot check)
CREATE POLICY "contact_insert_public"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
    (user_id IS NULL) OR (user_id = auth.uid())
);

-- Lectura: Exclusiva para administradores de Librería Universal (Privacidad total)
CREATE POLICY "contact_select_admin_only"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') IN ('admin', 'staff')
);

-- ==========================================
-- 4. POLÍTICAS PARA UPLOADED_FILES
-- ==========================================

-- Lectura: Solo el usuario que subió el archivo o personal autorizado
CREATE POLICY "files_select_own"
ON public.uploaded_files
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role') IN ('admin', 'staff')
);

-- Inserción: Solo con su propio user_id
CREATE POLICY "files_insert_own"
ON public.uploaded_files
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- Borrado: Solo el dueño del archivo o administradores
CREATE POLICY "files_delete_own"
ON public.uploaded_files
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid() OR
    (auth.jwt() ->> 'role') = 'admin'
);
