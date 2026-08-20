/**
 * VaniaDB — PostgreSQL + pgvector connection
 */
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.VANIA_DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function queryOne(text: string, params?: any[]) {
  const res = await pool.query(text, params);
  return res.rows[0] ?? null;
}
