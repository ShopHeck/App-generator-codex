import { GenerationPipeline } from "./generation-pipeline.js";

const pipeline = new GenerationPipeline();

const result = await pipeline.run({
  projectId: "project_demo_001",
  target: "ios_swiftui",
  prompt:
    'Build a fitness coaching app called "Momentum Coach" with login, subscription billing, and cloud sync. Include progress insights and a settings screen.'
});

console.log(
  JSON.stringify(
    {
      projectId: result.projectId,
      target: result.target,
      appName: result.spec.metadata.appName,
      screens: result.spec.screens.map((screen) => screen.name),
      integrations: result.spec.integrations,
      projectBlueprint: result.projectBlueprint,
      exportJob: { id: result.exportJob.id, status: result.exportJob.status },
      previewScreens: result.previewBundle.screens.map((s) => s.name),
      artifacts: result.artifacts
    },
    null,
    2
  )
);
