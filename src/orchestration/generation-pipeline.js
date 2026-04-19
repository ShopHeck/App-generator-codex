import { validateAppSpec } from "../domain/app-spec.js";
import { generateIosProjectBlueprint } from "../services/ios-project-generator.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { buildStructuredSpec } from "../services/spec-generator.js";
import { RevisionStore } from "../revisions/revision-store.js";
import { ExportService } from "../services/export-service.js";

export class GenerationPipeline {
  constructor({ revisionStore = new RevisionStore(), exportService = new ExportService() } = {}) {
    this.revisionStore = revisionStore;
    this.exportService = exportService;
  }

  run({ projectId, prompt }) {
    const normalizedPrompt = normalizePrompt(prompt);
    const intent = extractPromptIntent(normalizedPrompt);
    const spec = buildStructuredSpec(intent);

    validateAppSpec(spec);

    const projectBlueprint = generateIosProjectBlueprint(spec);
    const exportJob = this.exportService.createAndProcessJob({
      projectId,
      files: projectBlueprint.files
    });

    const specRevision = this.revisionStore.saveRevision(projectId, spec, "Generated structured app spec");
    const blueprintRevision = this.revisionStore.saveRevision(
      projectId,
      {
        projectName: projectBlueprint.projectName,
        directories: projectBlueprint.directories,
        fileCount: Object.keys(projectBlueprint.files).length,
        exportJobId: exportJob.id
      },
      "Generated iOS project blueprint"
    );

    return {
      projectId,
      normalizedPrompt,
      intent,
      spec,
      projectBlueprint: {
        projectName: projectBlueprint.projectName,
        directories: projectBlueprint.directories,
        fileCount: Object.keys(projectBlueprint.files).length
      },
      exportJob,
      revisions: [specRevision, blueprintRevision]
    };
  }
}
