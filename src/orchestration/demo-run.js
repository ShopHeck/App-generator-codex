import { GenerationPipeline } from "./generation-pipeline.js";

const pipeline = new GenerationPipeline();

const result = pipeline.run({
  projectId: "project_demo_001",
  prompt:
    'Build a fitness coaching app called "Momentum Coach" with login, subscription billing, and cloud sync. Include progress insights and a settings screen.'
});

console.log(JSON.stringify({
  projectId: result.projectId,
  appName: result.spec.metadata.appName,
  screens: result.spec.screens.map((screen) => screen.name),
  integrations: result.spec.integrations,
  generatedFiles: Object.keys(result.projectBlueprint.files)
}, null, 2));
