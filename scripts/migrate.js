#!/usr/bin/env node
/**
 * scripts/migrate.js — lightweight SQL migration runner.
 *
 * Reads every *.sql file from src/repositories/sql/migrations/ in
 * lexicographic (filename) order, skips ones that have already been
 * applied, and executes each inside a transaction.
 *
 * Usage:
 *   node scripts/migrate.js
 *
 * Environment:
 *   POSTGRES_URL  — full connection string (or POSTGRES_HOST/DB/USER/PASSWORD)
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../src/repositories/sql/migrations");

const BOOTSTRAP_SQL = `
  create table if not exists _migrations (
    id          serial primary key,
    filename    text not null unique,
    applied_at  timestamptz not null default now()
  );
`;

async function migrate() {
  const connectionString = process.env.POSTGRES_URL;
  const client = new Client(
    connectionString
      ? { connectionString }
      : {
          host: process.env.POSTGRES_HOST ?? "localhost",
          port: Number(process.env.POSTGRES_PORT ?? 5432),
          database: process.env.POSTGRES_DB ?? "app_generator",
          user: process.env.POSTGRES_USER ?? "postgres",
          password: process.env.POSTGRES_PASSWORD ?? "",
          ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : false
        }
  );

  await client.connect();
  console.log("[migrate] Connected to database.");

  try {
    // Ensure migration tracking table exists
    await client.query(BOOTSTRAP_SQL);

    // Load already-applied migrations
    const { rows: applied } = await client.query(
      "select filename from _migrations order by id"
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    // Read migration files in sorted order
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let ranCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] skipping ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "insert into _migrations (filename) values ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migrate] ✓ applied ${file}`);
        ranCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[migrate] ✗ failed on ${file}: ${err.message}`);
        process.exitCode = 1;
        return;
      }
    }

    if (ranCount === 0) {
      console.log("[migrate] No new migrations to apply.");
    } else {
      console.log(`[migrate] Applied ${ranCount} migration(s).`);
    }
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error("[migrate] Fatal error:", err.message);
  process.exitCode = 1;
});
