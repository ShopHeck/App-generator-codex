import { validateAppSpec } from "../domain/app-spec.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { parseIntentFromPrompt, IntentValidationError } from "../services/llm-intent-service.js";
import { buildStructuredSpec } from "../services/spec-generator.js";
import { getGenerator } from "../generators/registry.js";
import { generatePreviewBundle } from "../services/preview-generator.js";
import { ExportService } from "../services/export-service.js";
import { RevisionStore } from "../revisions/revision-store.js";

export class GenerationPipeline {
  constructor({
    revisionStore = new RevisionStore(),
    llmIntentService = parseIntentFromPrompt,
    exportService = new ExportService(),
    projectRepository = null,
    specRevisionRepository = null,
    generationRunRepository = null,
    planLimitService = null
  } = {}) {
    this.revisionStore = revisionStore;
    this.llmIntentService = llmIntentService;
    this.exportService = exportService;
    this.projectRepository = projectRepository;
    this.specRevisionRepository = specRevisionRepository;
    this.generationRunRepository = generationRunRepository;
    this.planLimitService = planLimitService;
  }

  async run({ projectId, prompt, target = "ios_swiftui", tenantId = null, userId = null }) {
    const isTenantScoped = Boolean(tenantId && userId);

    if (isTenantScoped && this.projectRepository) {
      const project = await this.projectRepository.getById({ tenantId, projectId });
      if (!project) {
        throw new Error("Project not found for tenant scope.");
      }
    }

    if (isTenantScoped && this.planLimitService) {
      await this.planLimitService.assertGenerationAllowed({ tenantId });
    }

    let normalizedPrompt = "";

    try {
      normalizedPrompt = normalizePrompt(prompt);
      const intent = this.resolveIntent(normalizedPrompt);
      const spec = buildStructuredSpec(intent);

      const validation = validateAppSpec(spec);
      if (!validation.valid) {
        const error = new Error("App spec validation failed.");
        error.code = "APP_SPEC_VALIDATION_FAILED";
        error.details = validation.errors;
        throw error;
      }

      const generator = getGenerator(target);
      const projectBlueprint = generator.generate(spec);
      const artifacts = buildArtifactMetadata({ projectBlueprint, generator, target });

      const previewBundle = generatePreviewBundle(spec);

      const exportJob = this.exportService.createAndProcessJob({
        projectId,
        files: projectBlueprint.files
      });

      const blueprintSummary = {
        projectName: projectBlueprint.projectName,
        directories: projectBlueprint.directories,
        fileCount: Object.keys(projectBlueprint.files).length,
        exportJobId: exportJob.id
      };

      let revisions;
      let generationRun;

      if (isTenantScoped && this.specRevisionRepository) {
        const specRevision = await this.specRevisionRepository.create({
          tenantId,
          projectId,
          userId,
          revisionType: "spec",
          payload: spec,
          message: "Generated structured app spec"
        });
        const previewRevision = await this.specRevisionRepository.create({
          tenantId,
          projectId,
          userId,
          revisionType: "preview_bundle",
          payload: previewBundle,
          message: "Generated app preview bundle"
        });
        const blueprintRevision = await this.specRevisionRepository.create({
          tenantId,
          projectId,
          userId,
          revisionType: "blueprint",
          payload: blueprintSummary,
          message: "Generated iOS project blueprint"
        });
        revisions = [specRevision, previewRevision, blueprintRevision];

        generationRun = await this.generationRunRepository.create({
          tenantId,
          projectId,
          userId,
          status: "success",
          prompt,
          normalizedPrompt,
          model: "rule-based-intent-v1"
        });
      } else {
        const specRevision = this.revisionStore.saveRevision(
          projectId,
          spec,
          "Generated structured app spec",
          "app_spec"
        );
        const previewRevision = this.revisionStore.saveRevision(
          projectId,
          previewBundle,
          "Generated app preview bundle",
          "preview_bundle"
        );
        const blueprintRevision = this.revisionStore.saveRevision(
          projectId,
          blueprintSummary,
          `Generated ${target} project blueprint`,
          "ios_project_blueprint"
        );
        revisions = [specRevision, previewRevision, blueprintRevision];
      }

      return {
        projectId,
        target,
        normalizedPrompt,
        intent,
        spec,
        previewBundle,
        projectBlueprint: blueprintSummary,
        exportJob,
        artifacts,
        ...(generationRun ? { generationRun } : {}),
        revisions
      };
    } catch (error) {
      if (isTenantScoped && this.generationRunRepository) {
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
      }

      throw error;
    }
  }

  resolveIntent(normalizedPrompt) {
    try {
      return this.llmIntentService(normalizedPrompt);
    } catch (error) {
      if (error instanceof IntentValidationError) {
        return extractPromptIntent(normalizedPrompt);
      }

      throw error;
    }
  }
}

function buildArtifactMetadata({ projectBlueprint, generator, target }) {
  const files = Object.keys(projectBlueprint.files).map((path) => ({
    path,
    kind: generator.artifactManifest.artifactKinds.files,
    size: projectBlueprint.files[path].length
  }));

  const directories = projectBlueprint.directories.map((path) => ({
    path,
    kind: generator.artifactManifest.artifactKinds.directories
  }));

  return {
    target,
    blueprintType: generator.artifactManifest.blueprintType,
    artifactFormat: generator.artifactManifest.artifactFormat,
    items: [...directories, ...files]
  };
}
