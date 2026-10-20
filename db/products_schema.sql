-- =============================================================================
-- LIBRERÍA UNIVERSAL - ESQUEMA DE BASE DE DATOS (PRODUCTOS & CATÁLOGO)
-- Compatible con Supabase / PostgreSQL con Row-Level Security (RLS)
-- Basado en la arquitectura de modelo relacional de tesla-computacion
-- =============================================================================

-- 1. Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla de productos y servicios
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL CHECK (
        categoria IN (
            'Librería Comercial',
            'Librería Escolar',
            'Servicios de Imprenta',
            'Sellos',
            'Sellos de corrección docente',
            'Insumos / Otros'
        )
    ),
    precio NUMERIC(12, 2) DEFAULT NULL, -- NULL o 0 indica "Consultar presupuesto"
    descripcion TEXT,
    imagen_url TEXT,
    stock BOOLEAN NOT NULL DEFAULT true,
    destacado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices para optimización de consultas y filtros del frontend y panel admin
CREATE INDEX IF NOT EXISTS idx_products_categoria ON public.products (categoria);
CREATE INDEX IF NOT EXISTS idx_products_destacado ON public.products (destacado);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

-- 4. Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_products_timestamp ON public.products;
CREATE TRIGGER trigger_update_products_timestamp
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- =============================================================================
-- 5. POLÍTICAS DE ROW-LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS en la tabla products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: LECTURA PÚBLICA (Todos los usuarios pueden ver los productos)
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
CREATE POLICY "Permitir lectura publica de productos"
    ON public.products
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- POLÍTICA 2: INSERCIÓN SOLO ADMINISTRADORES
DROP POLICY IF EXISTS "Solo administradores pueden insertar productos" ON public.products;
CREATE POLICY "Solo administradores pueden insertar productos"
    ON public.products
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- POLÍTICA 3: ACTUALIZACIÓN SOLO ADMINISTRADORES
DROP POLICY IF EXISTS "Solo administradores pueden actualizar productos" ON public.products;
CREATE POLICY "Solo administradores pueden actualizar productos"
    ON public.products
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- POLÍTICA 4: ELIMINACIÓN SOLO ADMINISTRADORES
DROP POLICY IF EXISTS "Solo administradores pueden eliminar productos" ON public.products;
CREATE POLICY "Solo administradores pueden eliminar productos"
    ON public.products
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- =============================================================================
-- 6. DATOS INICIALES (SEED DATA REALISTA DE LIBRERÍA UNIVERSAL)
-- =============================================================================

INSERT INTO public.products (nombre, categoria, precio, descripcion, imagen_url, stock, destacado)
VALUES
-- Librería Comercial
('Resma A4 Autor 75g (500 hojas)', 'Librería Comercial', 6200.00, 'Papel reprográfico alcalino ultra blanco. Ideal para fotocopiadoras, impresoras láser e inkjet de alto rendimiento.', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=80', true, true),
('Abrochadora Pinza MIT 50 Metálica', 'Librería Comercial', 14500.00, 'Estructura 100% de acero templado. Compatible con broches 26/6 y 21/6. Capacidad de abrochado de hasta 30 hojas.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', true, false),
('Cuerpo de Carpetas Colgantes Nepa x25', 'Librería Comercial', 18900.00, 'Carpetas de cartulina kraft con varilla de acero y visores plásticos móviles con etiquetas impresas para archivo.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80', true, false),
('Talonario Factura / Recibo X Duplicado', 'Librería Comercial', 3800.00, 'Papel químico autocopiante membretado estándar. 50 juegos numerados para contabilidad comercial.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80', true, false),

-- Librería Escolar
('Cuaderno Universitario Éxito 100 Hojas Cuadriculado', 'Librería Escolar', 4900.00, 'Tapa dura extra resistente forrada en polipropileno. Hojas de 90g de máxima blancura con espiral continuo.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80', true, true),
('Marcadores Filgo Pintor Pastel x6 Colores', 'Librería Escolar', 5400.00, 'Tinta al agua de secado instantáneo. Punta biselada que permite trazos de 1 a 4 mm. Ideal para lettering y estudio.', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80', true, true),
('Lapicera Roller Micro 0.5mm Tinta Gel', 'Librería Escolar', 2300.00, 'Punta aguja metálica con bola de carburo de tungsteno. Trazo suave, continuo y secado ultra rápido.', 'https://images.unsplash.com/photo-1585336261026-77cc7c975a5e?w=500&auto=format&fit=crop&q=80', true, false),
('Set de Geometría Pizzini Cristal 3 Piezas', 'Librería Escolar', 3600.00, 'Incluye regla de 20cm, escuadra de 45° y transportador de 180°. Acrílico biselado de alta transparencia.', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop&q=80', true, false),

-- Servicios de Imprenta
('Impresión Láser Color A3 Ilustración 300g', 'Servicios de Imprenta', 1850.00, 'Calidad digital HD milimétrica. Papel ilustración pesado de 300g ideal para posters, catálogos y presentaciones.', 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=500&auto=format&fit=crop&q=80', true, true),
('Folletos y Flyers Publicitarios 10x15cm x1000u', 'Servicios de Imprenta', 42000.00, 'Papel ilustración 150g brillante. Impresión full color offset frente y dorso. Entrega en 24/48 horas.', 'https://images.unsplash.com/photo-1572945550744-570425e392b5?w=500&auto=format&fit=crop&q=80', true, true),
('Tarjetas Personales de Presentación x100u', 'Servicios de Imprenta', 16500.00, 'Cartulina triplex importada de 350g con terminación mate sedosa y opción de esquinas redondeadas.', 'https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?w=500&auto=format&fit=crop&q=80', true, true),
('Talonarios AFIP Oficiales 1/4 Oficio x10', 'Servicios de Imprenta', 0.00, 'Impresión autorizada de talonarios fiscales con CAI. Papel químico duplicado o triplicado. Precio a convenir según cantidad.', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=80', true, false),

-- Sellos
('Sello Automático Trodat Printy 4912 (47x18mm)', 'Sellos', 15800.00, 'Aparato automático de máxima durabilidad para médicos, abogados y docentes. Hasta 4 líneas de texto personalizadas.', 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&auto=format&fit=crop&q=80', true, true),
('Sello de Bolsillo Trodat Pocket Printy 9511', 'Sellos', 17200.00, 'Mecanismo deslizable con una sola mano. Ultracompacto para profesionales en guardia y visitadores.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80', true, false),
('Sello de Madera Clásico Artesanal (50x30mm)', 'Sellos', 7900.00, 'Base de madera noble lustrada con goma vulcanizada láser de ultra alta definición y mango anatómico.', 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=80', true, false),
('Sello Docente Didáctico Didak Motivacional', 'Sellos', 6500.00, 'Modelos con emojis y frases de corrección escolar (Excelente, Messirve, A corregir). Color de tinta a elección.', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=80', true, true),

-- Insumos / Otros
('Tinta para Sello Trodat 7011 Frasco 28ml', 'Insumos / Otros', 4200.00, 'Fórmula a base de agua indeleble de secado rápido. Disponible en negro, azul, rojo y violeta.', 'https://images.unsplash.com/photo-1585336261026-77cc7c975a5e?w=500&auto=format&fit=crop&q=80', true, false),
('Almohadilla de Repuesto Trodat 6/4912', 'Insumos / Otros', 4900.00, 'Repuesto oficial original de fácil recambio sin mancharse los dedos. Entintado parejo y nítido.', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80', true, false),
('Bobina de Papel Térmico 57mm x 30m para Posnet x10', 'Insumos / Otros', 9500.00, 'Papel térmico libre de BPA de máxima sensibilidad y blancura. Compatible con terminales Posnet y Clover.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80', true, false)
ON CONFLICT (id) DO NOTHING;
