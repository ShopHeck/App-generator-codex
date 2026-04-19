import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";
import { getGenerator, listAvailableTargets } from "../src/generators/registry.js";

test("pipeline generates spec, project blueprint, artifact metadata, and revisions", () => {
  const pipeline = new GenerationPipeline();
  const result = pipeline.run({
    projectId: "project_123",
    target: "ios_swiftui",
    prompt:
      'Create a travel app called "Trip Planner Pro" with login, cloud sync, and premium subscription for itinerary sharing.'
  });

  assert.equal(result.target, "ios_swiftui");
  assert.equal(result.spec.metadata.appName, "Trip Planner Pro");
  assert.ok(result.spec.screens.length >= 3);
  assert.ok(result.spec.integrations.some((integration) => integration.type === "supabase"));
  assert.ok(result.spec.integrations.some((integration) => integration.type === "stripe"));
  assert.ok(result.projectBlueprint.files["TripPlannerPro/README.md"]);
  assert.equal(result.artifacts.target, "ios_swiftui");
  assert.equal(result.artifacts.blueprintType, "xcode_project_blueprint");
  assert.ok(result.artifacts.items.some((artifact) => artifact.path === "TripPlannerPro/README.md"));
  assert.equal(result.revisions.length, 2);
});

test("pipeline rejects low-signal prompts", () => {
  const pipeline = new GenerationPipeline();

  assert.throws(
    () => pipeline.run({ projectId: "project_321", prompt: "todo app" }),
    /Prompt is too short/
  );
});

test("generator registry lists and resolves supported targets", () => {
  assert.deepEqual(listAvailableTargets(), ["ios_swiftui"]);

  const generator = getGenerator("ios_swiftui");
  assert.equal(generator.target, "ios_swiftui");
  assert.ok(generator.artifactManifest);
});

test("generator registry rejects unsupported targets", () => {
  assert.throws(() => getGenerator("web_nextjs"), /Unsupported generation target: web_nextjs/);
});
