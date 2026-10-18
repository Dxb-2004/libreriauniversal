-- =============================================================================
-- LIBRERÍA UNIVERSAL - ESQUEMA DE BASE DE DATOS BLINDADO
-- Cumple estrictamente con:
-- Punto 3: Segregación de claves públicas y privadas
-- Punto 4: Row-Level Security (RLS) habilitado en todas las tablas
-- Punto 13: Consultas estructuradas para Prepared Statements
-- =============================================================================

-- Habilitar extensión para UUIDs criptográficos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE PERFILES DE USUARIOS (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE PEDIDOS Y DISEÑOS DE SELLOS (stamp_orders)
CREATE TABLE IF NOT EXISTS public.stamp_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    apparatus_type TEXT NOT NULL CHECK (apparatus_type IN ('automatico', 'madera')),
    line_count INTEGER NOT NULL CHECK (line_count BETWEEN 1 AND 4),
    -- Datos cifrados con AES-256 a nivel de aplicación (Punto 5)
    encrypted_lines_payload TEXT NOT NULL,
    lines_iv TEXT NOT NULL,
    lines_auth_tag TEXT NOT NULL,
    font_family TEXT NOT NULL,
    ink_color TEXT NOT NULL,
    border_style TEXT NOT NULL,
    drawing_code TEXT,
    drawing_position TEXT CHECK (drawing_position IN ('none', 'left', 'right')),
    customer_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_production', 'ready_for_pickup', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE MENSAJES DE CONTACTO Y COTIZACIÓN (contact_messages)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Puede ser anónimo o autenticado
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service_type TEXT NOT NULL,
    message TEXT NOT NULL,
    ip_hash TEXT NOT NULL, -- Hasheado para trazabilidad y rate-limit sin almacenar IP en plano
    bot_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE ARCHIVOS SUBIDOS SEGURAMENTE (uploaded_files)
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    sanitized_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_hash_sha256 TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ACTIVACIÓN OBLIGATORIA DE ROW-LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Forzar RLS incluso para propietarios de la tabla (salvo service_role)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files FORCE ROW LEVEL SECURITY;
