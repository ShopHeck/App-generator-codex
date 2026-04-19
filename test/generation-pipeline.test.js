import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";

function createPipelineHarness() {
  const events = {
    revisions: [],
    runs: []
  };

  const pipeline = new GenerationPipeline({
    projectRepository: {
      async getById({ tenantId, projectId }) {
        if (tenantId === "tenant_missing") {
          return null;
        }

        return { id: projectId, tenant_id: tenantId, name: "Trip Planner Pro", status: "active" };
      }
    },
    specRevisionRepository: {
      async create(input) {
        const revision = {
          id: `rev_${events.revisions.length + 1}`,
          ...input
        };
        events.revisions.push(revision);
        return revision;
      }
    },
    generationRunRepository: {
      async create(input) {
        const run = {
          id: `run_${events.runs.length + 1}`,
          ...input
        };
        events.runs.push(run);
        return run;
      }
    },
    planLimitService: {
      async assertGenerationAllowed({ tenantId }) {
        if (tenantId === "tenant_blocked") {
          throw new Error("Monthly generation limit reached for tenant subscription.");
        }
      }
    }
  });

  return { pipeline, events };
}

test("pipeline generates spec, project blueprint, and persisted run/revisions", async () => {
  const { pipeline, events } = createPipelineHarness();

  const result = await pipeline.run({
    tenantId: "tenant_123",
    userId: "user_123",
    projectId: "project_123",
    prompt:
      'Create a travel app called "Trip Planner Pro" with login, cloud sync, and premium subscription for itinerary sharing.'
  });

  assert.equal(result.spec.metadata.appName, "Trip Planner Pro");
  assert.ok(result.spec.screens.length >= 3);
  assert.ok(result.spec.integrations.some((integration) => integration.type === "supabase"));
  assert.ok(result.spec.integrations.some((integration) => integration.type === "stripe"));
  assert.ok(result.projectBlueprint.files["TripPlannerPro/README.md"]);
  assert.equal(result.revisions.length, 2);
  assert.equal(result.generationRun.status, "success");
  assert.equal(events.runs.length, 1);
  assert.equal(events.revisions.length, 2);
});

test("pipeline rejects low-signal prompts and records a failed run", async () => {
  const { pipeline, events } = createPipelineHarness();

  await assert.rejects(
    pipeline.run({ tenantId: "tenant_321", userId: "user_321", projectId: "project_321", prompt: "todo app" }),
    /Prompt is too short/
  );

  assert.equal(events.runs.length, 1);
  assert.equal(events.runs[0].status, "failed");
});

test("pipeline enforces project tenant scoping", async () => {
  const { pipeline } = createPipelineHarness();

  await assert.rejects(
    pipeline.run({ tenantId: "tenant_missing", userId: "user_1", projectId: "project_1", prompt: "Build an app" }),
    /Project not found for tenant scope/
  );
});

test("pipeline enforces generation plan limits", async () => {
  const { pipeline } = createPipelineHarness();

  await assert.rejects(
    pipeline.run({
      tenantId: "tenant_blocked",
      userId: "user_1",
      projectId: "project_1",
      prompt: "Build a B2B invoicing app with auth and exports"
    }),
    /Monthly generation limit reached/
  );
});
