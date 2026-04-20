/**
 * Integration tests — GenerationPipeline with real Postgres.
 *
 * These tests require a running Postgres instance.
 * They are skipped when INTEGRATION_TEST is not set to "1".
 *
 * Run locally:
 *   docker compose -f docker-compose.test.yml up --abort-on-container-exit
 * Or with a local DB:
 *   INTEGRATION_TEST=1 npm run test:integration
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldRunIntegration,
  createTestDb,
  createTestTenant,
  createTestUser,
  createTestProject,
  cleanupTenant
} from "./setup.js";
import { GenerationPipeline } from "../../src/orchestration/generation-pipeline.js";
import { ProjectRepository } from "../../src/repositories/project-repository.js";
import { SpecRevisionRepository } from "../../src/repositories/spec-revision-repository.js";
import { GenerationRunRepository } from "../../src/repositories/generation-run-repository.js";
import { ExportRepository } from "../../src/repositories/export-repository.js";
import { TenantRepository } from "../../src/repositories/tenant-repository.js";
import { PlanLimitService } from "../../src/services/plan-limit-service.js";

if (!shouldRunIntegration()) {
  // Not an error — integration tests require a real DB and are opt-in
  console.log("[integration] Skipping integration tests (set INTEGRATION_TEST=1 to run).");
  process.exit(0);
}

// ─── Setup shared DB pool ─────────────────────────────────────────────────────

const db = createTestDb();

test.after(async () => {
  await db.end();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPipeline(db) {
  const projectRepository = new ProjectRepository({ db });
  const specRevisionRepository = new SpecRevisionRepository({ db });
  const generationRunRepository = new GenerationRunRepository({ db });
  const exportRepository = new ExportRepository({ db });
  const tenantRepository = new TenantRepository({ db });

  const planLimitService = new PlanLimitService({
    tenantRepository,
    generationRunRepository,
    exportRepository
  });

  return new GenerationPipeline({
    projectRepository,
    specRevisionRepository,
    generationRunRepository,
    planLimitService
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test("integration: pipeline persists spec revisions and generation run to Postgres", async () => {
  const tenantId = await createTestTenant(db);
  const userId = await createTestUser(db, tenantId);
  const projectId = await createTestProject(db, tenantId, userId);

  try {
    const pipeline = buildPipeline(db);
    const result = await pipeline.run({
      tenantId,
      userId,
      projectId,
      prompt:
        'Build a fitness coaching app called "FitTrack Pro" with login, cloud sync, and subscription billing.'
    });

    assert.equal(result.spec.metadata.appName, "FitTrack Pro");
    assert.ok(result.generationRun.id);
    assert.equal(result.generationRun.status, "success");
    assert.equal(result.revisions.length, 3);

    // Verify data was actually written to DB
    const { rows: runRows } = await db.query(
      "select id, status from generation_runs where id = $1",
      [result.generationRun.id]
    );
    assert.equal(runRows.length, 1);
    assert.equal(runRows[0].status, "success");

    const { rows: revisionRows } = await db.query(
      "select revision_type from spec_revisions where project_id = $1 order by created_at",
      [projectId]
    );
    assert.equal(revisionRows.length, 3);
    assert.deepEqual(
      revisionRows.map((r) => r.revision_type),
      ["spec", "preview_bundle", "blueprint"]
    );
  } finally {
    await cleanupTenant(db, tenantId);
  }
});

test("integration: failed generation records a failed run in Postgres", async () => {
  const tenantId = await createTestTenant(db);
  const userId = await createTestUser(db, tenantId);
  const projectId = await createTestProject(db, tenantId, userId);

  try {
    const pipeline = buildPipeline(db);

    await assert.rejects(
      () =>
        pipeline.run({
          tenantId,
          userId,
          projectId,
          prompt: "tiny"
        }),
      /Prompt is too short/
    );

    const { rows } = await db.query(
      "select status, error_message from generation_runs where project_id = $1",
      [projectId]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "failed");
    assert.ok(rows[0].error_message.includes("too short"));
  } finally {
    await cleanupTenant(db, tenantId);
  }
});

test("integration: plan limit is enforced against real DB counts", async () => {
  // Tenant with very tight generation limit (1 run allowed)
  const tenantId = await createTestTenant(db, { generationLimit: 1, exportLimit: 5 });
  const userId = await createTestUser(db, tenantId);
  const projectId = await createTestProject(db, tenantId, userId);

  try {
    const pipeline = buildPipeline(db);
    const prompt =
      'Create a sales CRM called "DealsFlow" with lead tracking, pipeline view, and Stripe billing.';

    // First run should succeed
    const result = await pipeline.run({ tenantId, userId, projectId, prompt });
    assert.equal(result.generationRun.status, "success");

    // Second run should be blocked by plan limit
    await assert.rejects(
      () => pipeline.run({ tenantId, userId, projectId, prompt }),
      /Monthly generation limit reached/
    );
  } finally {
    await cleanupTenant(db, tenantId);
  }
});

test("integration: tenant repository returns plan limits from DB", async () => {
  const tenantId = await createTestTenant(db, { plan: "pro", generationLimit: 100, exportLimit: 40 });

  try {
    const tenantRepository = new TenantRepository({ db });
    const limits = await tenantRepository.getPlanLimits({ tenantId });

    assert.equal(limits.plan_tier, "pro");
    assert.equal(limits.monthly_generation_limit, 100);
    assert.equal(limits.monthly_export_limit, 40);
  } finally {
    await cleanupTenant(db, tenantId);
  }
});
