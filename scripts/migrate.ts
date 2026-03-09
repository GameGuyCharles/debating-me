import { Pool } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log("Running migrations...\n");

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get list of migration files
  const migrationsDir = join(process.cwd(), "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Get already executed migrations
  const executed = await pool.query(`SELECT name FROM _migrations`);
  const executedNames = new Set(executed.rows.map((r: { name: string }) => r.name));

  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`  [skip] ${file} (already executed)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    try {
      await pool.query("BEGIN");
      await pool.query(sql);
      await pool.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
      await pool.query("COMMIT");
      console.log(`  [done] ${file}`);
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error(`  [fail] ${file}:`, err);
      process.exit(1);
    }
  }

  console.log("\nMigrations complete!");
  await pool.end();
}

migrate().catch(console.error);
