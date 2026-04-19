import test from "node:test";
import assert from "node:assert/strict";
import { GenerationPipeline } from "../src/orchestration/generation-pipeline.js";

test("pipeline generates spec, project blueprint, and revisions", () => {
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
  assert.ok(result.projectBlueprint.files["TripPlannerPro/README.md"]);
  assert.equal(result.revisions.length, 2);
});

test("pipeline logs generated AppSpec for realistic prompt", () => {
  const pipeline = new GenerationPipeline();
  const result = pipeline.run({
    projectId: "project_log_456",
    prompt:
      'Build a sales CRM app called "Revenue Pilot" that helps teams track leads, automate follow-ups, analyze conversion metrics, and monetize with premium billing.'
  });

  assert.equal(result.spec.metadata.appName, "Revenue Pilot");
  assert.equal(result.intent.domain, "sales");

  // Explicit logging requested for generated AppSpec visibility.
  console.log("Generated AppSpec:\n", JSON.stringify(result.spec, null, 2));
});

test("pipeline rejects low-signal prompts", () => {
  const pipeline = new GenerationPipeline();

  assert.throws(
    () => pipeline.run({ projectId: "project_321", prompt: "todo app" }),
    /Prompt is too short/
  );
});
