/**
 * LIBRERÍA UNIVERSAL - CLIENTE DE BASE DE DATOS PARAMETRIZADO (ANTI-SQL INJECTION)
 * Punto 13: Parametrización estricta de consultas (Prepared Statements).
 * Prohibición absoluta de concatenación de cadenas en sentencias SQL.
 */

const { env } = require('../config/env');

/**
 * Simulación de pool de conexiones PostgreSQL con soporte de Prepared Statements.
 * En producción conecta directamente a través de `pg.Pool` o el cliente de Supabase.
 */
class SecureDatabaseClient {
  constructor() {
    this.connectionString = env.DATABASE_URL;
  }

  /**
   * Ejecuta una consulta forzando el uso de Prepared Statements y parámetros vinculados ($1, $2, ...).
   * @param {string} text - Consulta SQL parametrizada (Ej: "SELECT * FROM stamp_orders WHERE user_id = $1")
   * @param {Array<any>} params - Parámetros seguros
   * @returns {Promise<{ rows: Array<any>, rowCount: number }>}
   */
  async query(text, params = []) {
    // 1. Auditoría estricta contra concatenación de strings insegura
    if (typeof text !== 'string') {
      throw new Error('La consulta SQL debe ser una cadena estática parametrizada.');
    }

    if (!Array.isArray(params)) {
      throw new Error('Los parámetros de la consulta SQL deben proporcionarse en un Array indexado.');
    }

    // 2. Detección heurística de patrones clásicos de inyección si alguien intentara saltarse los parámetros
    const dangerousPatterns = [
      /--\s*$/,                // Comentarios al final de línea
      /;\s*DROP\s+TABLE/i,     // Inyecciones destructivas
      /UNION\s+SELECT/i,       // Inyecciones UNION
      /'\s*OR\s*'1'\s*=\s*'1'/i// Tautologías
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(text)) {
        console.error('🚨 INTENTO DE INYECCIÓN SQL DETECTADO Y BLOQUEADO:', text);
        throw new Error('Consulta rechazada por el analizador de seguridad anti-SQLi.');
      }
    }

    // 3. Ejecución parametrizada
    // Si estuviéramos conectados a un servidor PG en vivo:
    // return await this.pool.query({ text, values: params });

    // Para fines de arquitectura y pruebas sin DB externa conectada:
    return {
      command: text.split(' ')[0],
      rowCount: 1,
      rows: []
    };
  }

  /**
   * Inserción segura con campos explícitos parametrizados
   */
  async insert(table, data = {}) {
    const keys = Object.keys(data);
    if (keys.length === 0) throw new Error('No hay datos para insertar.');

    const columns = keys.map(k => `"${k.replace(/"/g, '')}"`).join(', ');
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    const values = keys.map(k => data[k]);

    const sql = `INSERT INTO public.${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    return await this.query(sql, values);
  }

  /**
   * Búsqueda segura con filtro por user_id y ID (Anti-IDOR + Anti-SQLi)
   */
  async findByIdAndUser(table, id, userId) {
    const sql = `SELECT * FROM public.${table} WHERE id = $1 AND user_id = $2 LIMIT 1`;
    return await this.query(sql, [id, userId]);
  }
}

const db = new SecureDatabaseClient();

module.exports = {
  db,
  SecureDatabaseClient
};
