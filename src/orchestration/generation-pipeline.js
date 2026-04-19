import { validateAppSpec } from "../domain/app-spec.js";
import { normalizePrompt, extractPromptIntent } from "../services/prompt-intake.js";
import { buildStructuredSpec } from "../services/spec-generator.js";
import { RevisionStore } from "../revisions/revision-store.js";
import { getGenerator } from "../generators/registry.js";

export class GenerationPipeline {
  constructor({ revisionStore = new RevisionStore() } = {}) {
    this.revisionStore = revisionStore;
  }

  run({ projectId, prompt, target = "ios_swiftui" }) {
    const normalizedPrompt = normalizePrompt(prompt);
    const intent = extractPromptIntent(normalizedPrompt);
    const spec = buildStructuredSpec(intent);

    validateAppSpec(spec);

    const generator = getGenerator(target);
    const projectBlueprint = generator.generate(spec);
    const artifacts = buildArtifactMetadata({ projectBlueprint, generator, target });

    const specRevision = this.revisionStore.saveRevision(projectId, spec, "Generated structured app spec");
    const blueprintRevision = this.revisionStore.saveRevision(
      projectId,
      projectBlueprint,
      `Generated ${target} project blueprint`
    );

    return {
      projectId,
      target,
      normalizedPrompt,
      intent,
      spec,
      projectBlueprint,
      artifacts,
      revisions: [specRevision, blueprintRevision]
    };
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
