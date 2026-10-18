/**
 * LIBRERÍA UNIVERSAL - GESTIÓN SEGURA DE VARIABLES DE ENTORNO
 * Punto 1 y 3: Ocultar claves privadas y segregación de claves públicas/privadas.
 */
require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('https://libreriauniversal.vercel.app'),

  // Secretos Criptográficos
  AES_ENCRYPTION_KEY: z.string().min(64).default('e83a7f603c158d6b9d8819a3c200947cb239df1d072f5341be60ad0432dfca91'),
  JWT_SECRET: z.string().min(32).default('lu_prod_sec_jwt_981273948172938471928374918237498172938471'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16).default('lu_cookie_secret_salt_19283746501928374650192837465012'),

  // Base de datos (Segregación de Claves)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  DATABASE_URL: z.string().optional(),

  // Anti-Bots
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),

  // Subida de Archivos
  MAX_FILE_SIZE_MB: z.coerce.number().default(5),
  UPLOAD_DIRECTORY: z.string().default('./secure_uploads'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('https://libreriauniversal.vercel.app,http://localhost:3000'),

  // Credenciales de Administrador
  ADMIN_EMAIL: z.string().email().default('libu.impresiones@gmail.com'),
  ADMIN_PASSWORD: z.string().min(8).default('UniversalAlsina2026!')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Error de configuración crítica en variables de entorno:', parsedEnv.error.format());
  throw new Error('Configuración de entorno inválida. Revise su archivo .env');
}

const env = parsedEnv.data;

/**
 * Retorna ÚNICAMENTE las variables públicas y seguras para el cliente.
 * Garantiza que ninguna clave privada (service_role, JWT, AES) se exponga.
 */
function getClientConfig() {
  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || null,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    appUrl: env.APP_URL
  };
}

module.exports = {
  env,
  getClientConfig
};
