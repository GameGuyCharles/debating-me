import { Pool } from "pg";

// Lazy-initialize the pool so DATABASE_URL is available when first query runs.
// The custom server (tsx server.ts) loads env vars via Next.js app.prepare(),
// but module imports execute before that. Lazy init fixes the ECONNREFUSED error.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return _pool;
}

// Proxy forwards all property access and method calls to the lazily-created pool
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const realPool = getPool();
    const value = Reflect.get(realPool, prop, realPool);
    if (typeof value === "function") {
      return value.bind(realPool);
    }
    return value;
  },
});
