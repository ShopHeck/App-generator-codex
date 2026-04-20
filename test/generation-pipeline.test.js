import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";
import { getGenerator, listAvailableTargets } from "../src/generators/registry.js";
import { IntentValidationError } from "../src/services/llm-intent-service.js";

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

test("pipeline falls back to heuristic parser when llm intent output is malformed", () => {
  const pipeline = new GenerationPipeline({
    llmIntentService: () => {
      throw new IntentValidationError("LLM intent output failed schema validation.");
    }
  });

  const result = pipeline.run({
    projectId: "project_ambiguous",
    prompt:
      "Create an app for teams that can handle travel, deals, and budget tracking with collaboration and automation options."
  });

  assert.equal(result.intent.appName, "Generated App");
  assert.equal(result.intent.domain, "travel");
  assert.ok(result.spec.metadata.appName);
});

test("pipeline defaults missing app name to Generated App", () => {
  const pipeline = new GenerationPipeline();

  const result = pipeline.run({
    projectId: "project_missing_name",
    prompt: "Build a finance planning app with cloud sync, login, and premium billing for household budgets."
  });

  assert.equal(result.intent.appName, "Generated App");
  assert.equal(result.spec.metadata.appName, "Generated App");
  assert.equal(result.intent.domain, "finance");
});
