/**
 * Integration test setup helpers.
 *
 * Provides `createTestDb()` which returns a pg.Pool connected to the
 * integration test database and cleans up test data between tests.
 *
 * Skips automatically when INTEGRATION_TEST env var is not set so that
 * `npm test` in CI/local environments without a real DB does not fail.
 */

import { createDbPool } from "../../src/db/client.js";

export function shouldRunIntegration() {
  return Boolean(process.env.INTEGRATION_TEST);
}

/**
 * Create a pg.Pool for the integration test database.
 * Callers are responsible for calling `pool.end()` when done.
 *
 * @returns {import('pg').Pool}
 */
export function createTestDb() {
  return createDbPool({
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB ?? "app_generator_test",
    user: process.env.POSTGRES_USER ?? "postgres",
    password: process.env.POSTGRES_PASSWORD ?? "postgres",
    ssl: false
  });
}

/**
 * Insert a minimal test tenant and return its id.
 *
 * @param {object} db — pg.Pool
 * @param {object} [opts]
 */
export async function createTestTenant(db, opts = {}) {
  const { rows } = await db.query(
    `insert into tenants (name, plan_tier, monthly_generation_limit, monthly_export_limit)
     values ($1, $2, $3, $4)
     returning id`,
    [
      opts.name ?? "Test Tenant",
      opts.plan ?? "pro",
      opts.generationLimit ?? 100,
      opts.exportLimit ?? 40
    ]
  );
  return rows[0].id;
}

/**
 * Insert a minimal test user and return its id.
 *
 * @param {object} db
 * @param {string} tenantId
 * @param {object} [opts]
 */
export async function createTestUser(db, tenantId, opts = {}) {
  const { rows } = await db.query(
    `insert into users (tenant_id, email, full_name, role)
     values ($1, $2, $3, $4)
     returning id`,
    [
      tenantId,
      opts.email ?? `test-${Date.now()}@example.com`,
      opts.fullName ?? "Test User",
      opts.role ?? "member"
    ]
  );
  return rows[0].id;
}

/**
 * Insert a minimal test project and return its id.
 *
 * @param {object} db
 * @param {string} tenantId
 * @param {string} ownerUserId
 * @param {object} [opts]
 */
export async function createTestProject(db, tenantId, ownerUserId, opts = {}) {
  const { rows } = await db.query(
    `insert into projects (tenant_id, owner_user_id, name, status)
     values ($1, $2, $3, $4)
     returning id`,
    [tenantId, ownerUserId, opts.name ?? "Integration Test Project", "active"]
  );
  return rows[0].id;
}

/**
 * Delete all test data created for a specific tenant.
 * Run after each test to keep the DB clean.
 *
 * @param {object} db
 * @param {string} tenantId
 */
export async function cleanupTenant(db, tenantId) {
  await db.query("delete from generation_runs where tenant_id = $1", [tenantId]);
  await db.query("delete from spec_revisions where tenant_id = $1", [tenantId]);
  await db.query("delete from exports where tenant_id = $1", [tenantId]);
  await db.query("delete from projects where tenant_id = $1", [tenantId]);
  await db.query("delete from users where tenant_id = $1", [tenantId]);
  await db.query("delete from tenants where id = $1", [tenantId]);
}
