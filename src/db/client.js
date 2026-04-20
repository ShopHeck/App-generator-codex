/**
 * PostgreSQL connection pool.
 *
 * All repositories receive a `db` object that exposes a `.query(sql, params)`
 * method — the standard interface of a `pg.Pool` instance.
 *
 * Required environment variables (when not using explicit config):
 *   POSTGRES_URL  — full connection string (preferred in production)
 *     or individually:
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
 */

import pg from "pg";

const { Pool } = pg;

/**
 * @param {object} [config] — optional override for testing; defaults to env vars.
 * @returns {pg.Pool}
 */
export function createDbPool(config = {}) {
  const poolConfig = config.connectionString
    ? { connectionString: config.connectionString, ...config }
    : {
        host: config.host ?? process.env.POSTGRES_HOST ?? "localhost",
        port: Number(config.port ?? process.env.POSTGRES_PORT ?? 5432),
        database: config.database ?? process.env.POSTGRES_DB ?? "app_generator",
        user: config.user ?? process.env.POSTGRES_USER ?? "postgres",
        password: config.password ?? process.env.POSTGRES_PASSWORD ?? "",
        ssl: config.ssl ?? parseSslOption(process.env.POSTGRES_SSL),
        max: Number(config.max ?? process.env.POSTGRES_POOL_MAX ?? 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000
      };

  const pool = new Pool(poolConfig);

  pool.on("error", (err) => {
    // Emit to stderr so the process logger can catch it without crashing
    process.stderr.write(`[db] Unexpected idle client error: ${err.message}\n`);
  });

  return pool;
}

function parseSslOption(value) {
  if (!value || value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;
  if (value === "require") return { rejectUnauthorized: false };
  return false;
}
