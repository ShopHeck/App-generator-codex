import { validateAppSpec } from "../domain/app-spec.js";
import { generateIosProjectBlueprint } from "../services/ios-project-generator.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { buildStructuredSpec } from "../services/spec-generator.js";

export class GenerationPipeline {
  constructor({ projectRepository, specRevisionRepository, generationRunRepository, planLimitService }) {
    this.projectRepository = projectRepository;
    this.specRevisionRepository = specRevisionRepository;
    this.generationRunRepository = generationRunRepository;
    this.planLimitService = planLimitService;
  }

  async run({ tenantId, userId, projectId, prompt }) {
    if (!tenantId || !userId || !projectId) {
      throw new Error("tenantId, userId, and projectId are required.");
    }

    const project = await this.projectRepository.getById({ tenantId, projectId });
    if (!project) {
      throw new Error("Project not found for tenant scope.");
    }

    await this.planLimitService.assertGenerationAllowed({ tenantId });

    let normalizedPrompt = "";

    try {
      normalizedPrompt = normalizePrompt(prompt);
      const intent = extractPromptIntent(normalizedPrompt);
      const spec = buildStructuredSpec(intent);

      validateAppSpec(spec);

      const projectBlueprint = generateIosProjectBlueprint(spec);

      const specRevision = await this.specRevisionRepository.create({
        tenantId,
        projectId,
        userId,
        revisionType: "spec",
        payload: spec,
        message: "Generated structured app spec"
      });

      const blueprintRevision = await this.specRevisionRepository.create({
        tenantId,
        projectId,
        userId,
        revisionType: "blueprint",
        payload: projectBlueprint,
        message: "Generated iOS project blueprint"
      });

      const generationRun = await this.generationRunRepository.create({
        tenantId,
        projectId,
        userId,
        status: "success",
        prompt,
        normalizedPrompt,
        model: "rule-based-intent-v1"
      });

      return {
        projectId,
        normalizedPrompt,
        intent,
        spec,
        projectBlueprint,
        generationRun,
        revisions: [specRevision, blueprintRevision]
      };
    } catch (error) {
      await this.generationRunRepository.create({
        tenantId,
        projectId,
        userId,
        status: "failed",
        prompt,
        normalizedPrompt,
        model: "rule-based-intent-v1",
        errorMessage: error.message
      });

      throw error;
    }
  }
}
