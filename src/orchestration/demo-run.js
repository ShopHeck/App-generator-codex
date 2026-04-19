import { GenerationPipeline } from "./generation-pipeline.js";

function createDemoPipeline() {
  const projectRepository = {
    async getById({ tenantId, projectId }) {
      return { id: projectId, tenant_id: tenantId, name: "Momentum Coach", status: "active" };
    }
  };

  const specRevisionRepository = {
    async create({ revisionType, message, payload }) {
      return {
        id: `demo_${revisionType}`,
        revision_type: revisionType,
        message,
        payload,
        created_at: new Date().toISOString()
      };
    }
  };

  const generationRunRepository = {
    async create({ status, prompt, normalizedPrompt }) {
      return {
        id: `run_${status}`,
        status,
        prompt,
        normalized_prompt: normalizedPrompt,
        created_at: new Date().toISOString()
      };
    }
  };

  const planLimitService = {
    async assertGenerationAllowed() {
      return true;
    }
  };

  return new GenerationPipeline({
    projectRepository,
    specRevisionRepository,
    generationRunRepository,
    planLimitService
  });
}

const pipeline = createDemoPipeline();

const result = await pipeline.run({
  tenantId: "tenant_demo_001",
  userId: "user_demo_001",
  projectId: "project_demo_001",
  prompt:
    'Build a fitness coaching app called "Momentum Coach" with login, subscription billing, and cloud sync. Include progress insights and a settings screen.'
});

console.log(
  JSON.stringify(
    {
      projectId: result.projectId,
      appName: result.spec.metadata.appName,
      screens: result.spec.screens.map((screen) => screen.name),
      integrations: result.spec.integrations,
      generatedFiles: Object.keys(result.projectBlueprint.files),
      runStatus: result.generationRun.status
    },
    null,
    2
  )
);
