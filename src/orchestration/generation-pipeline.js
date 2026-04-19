import { validateAppSpec } from "../domain/app-spec.js";
import { generateIosProjectBlueprint } from "../services/ios-project-generator.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { parseIntentFromPrompt, IntentValidationError } from "../services/llm-intent-service.js";
import { buildStructuredSpec } from "../services/spec-generator.js";
import { RevisionStore } from "../revisions/revision-store.js";

export class GenerationPipeline {
  constructor({ revisionStore = new RevisionStore(), llmIntentService = parseIntentFromPrompt } = {}) {
    this.revisionStore = revisionStore;
    this.llmIntentService = llmIntentService;
  }

  run({ projectId, prompt }) {
    const normalizedPrompt = normalizePrompt(prompt);
    const intent = this.resolveIntent(normalizedPrompt);
    const spec = buildStructuredSpec(intent);

    const validation = validateAppSpec(spec);
    if (!validation.valid) {
      const error = new Error("App spec validation failed.");
      error.code = "APP_SPEC_VALIDATION_FAILED";
      error.details = validation.errors;
      throw error;
    }

    const projectBlueprint = generateIosProjectBlueprint(spec);

    const specRevision = this.revisionStore.saveRevision(projectId, spec, "Generated structured app spec");
    const blueprintRevision = this.revisionStore.saveRevision(
      projectId,
      projectBlueprint,
      "Generated iOS project blueprint"
    );

    return {
      projectId,
      normalizedPrompt,
      intent,
      spec,
      projectBlueprint,
      revisions: [specRevision, blueprintRevision]
    };
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
