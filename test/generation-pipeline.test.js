import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";

test("pipeline generates spec, preview bundle, project blueprint, and typed revisions", () => {
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
  assert.ok(result.previewBundle.screens.length >= 3);
  assert.ok(result.previewBundle.components.length > 0);
  assert.ok(result.previewBundle.routes.length >= 3);
  assert.ok(result.previewBundle.sampleData.length > 0);
  assert.ok(result.projectBlueprint.files["TripPlannerPro/README.md"]);
  assert.equal(result.revisions.length, 3);
  assert.deepEqual(
    result.revisions.map((revision) => revision.type),
    ["app_spec", "preview_bundle", "ios_project_blueprint"]
  );
});

test("pipeline rejects low-signal prompts", () => {
  const pipeline = new GenerationPipeline();

  assert.throws(
    () => pipeline.run({ projectId: "project_321", prompt: "todo app" }),
    /Prompt is too short/
  );
});
