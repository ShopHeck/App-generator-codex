import { validateAppSpec } from "../domain/app-spec.js";
import { generateIosProjectBlueprint } from "../services/ios-project-generator.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { buildStructuredSpec } from "../services/spec-generator.js";
import { generatePreviewBundle } from "../services/preview-generator.js";
import { RevisionStore } from "../revisions/revision-store.js";

export class GenerationPipeline {
  constructor({ revisionStore = new RevisionStore() } = {}) {
    this.revisionStore = revisionStore;
  }

  run({ projectId, prompt }) {
    const normalizedPrompt = normalizePrompt(prompt);
    const intent = extractPromptIntent(normalizedPrompt);
    const spec = buildStructuredSpec(intent);

    validateAppSpec(spec);

    const previewBundle = generatePreviewBundle(spec);
    const projectBlueprint = generateIosProjectBlueprint(spec);

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
      projectBlueprint,
      "Generated iOS project blueprint",
      "ios_project_blueprint"
    );

    return {
      projectId,
      normalizedPrompt,
      intent,
      spec,
      previewBundle,
      projectBlueprint,
      revisions: [specRevision, previewRevision, blueprintRevision]
    };
  }
}
