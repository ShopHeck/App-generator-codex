import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";

test("pipeline generates spec, project blueprint summary, export job, and revisions", () => {
  const pipeline = new GenerationPipeline();
  const result = pipeline.run({
    projectId: "project_123",
    prompt:
      'Create a travel app called "Trip Planner Pro" with login, cloud sync, and premium subscription for itinerary sharing.'
  });

  assert.equal(result.spec.metadata.appName, "Trip Planner Pro");
  assert.ok(result.spec.screens.length >= 3);
  assert.ok(result.spec.integrations.some((integration) => integration.type === "supabase"));
  assert.ok(result.spec.integrations.some((integration) => integration.type === "stripe"));
  assert.equal(result.projectBlueprint.projectName, "TripPlannerPro");
  assert.ok(result.projectBlueprint.fileCount > 0);
  assert.equal(result.exportJob.status, "completed");
  assert.ok(result.exportJob.file);
  assert.equal(result.revisions.length, 2);
});

test("pipeline rejects low-signal prompts", () => {
  const pipeline = new GenerationPipeline();

  assert.throws(
    () => pipeline.run({ projectId: "project_321", prompt: "todo app" }),
    /Prompt is too short/
  );
});
