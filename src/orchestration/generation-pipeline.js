import { validateAppSpec } from "../domain/app-spec.js";
import { generateIosProjectBlueprint } from "../services/ios-project-generator.js";
import { normalizePrompt, promptParser } from "../services/prompt-intake.js";
import { specGenerator } from "../services/spec-generator.js";
import { RevisionStore } from "../revisions/revision-store.js";

export class GenerationPipeline {
  constructor({ revisionStore = new RevisionStore() } = {}) {
    this.revisionStore = revisionStore;
  }

  run({ projectId, prompt }) {
    const normalizedPrompt = normalizePrompt(prompt);
    const intent = promptParser(normalizedPrompt);
    const spec = specGenerator(intent);

    validateAppSpec(spec);

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
}
