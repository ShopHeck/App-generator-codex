import { validateAppSpec } from "./app-spec.js";

export const GENERATION_STATUS = Object.freeze({
  idle: "idle",
  queued: "queued",
  running: "running",
  completed: "completed",
  failed: "failed"
});

export function validateProjectBlueprint(blueprint) {
  if (!blueprint?.projectName) {
    throw new Error("Artifact validation failed: projectBlueprint.projectName is required.");
  }

  if (!Array.isArray(blueprint.directories)) {
    throw new Error("Artifact validation failed: projectBlueprint.directories must be an array.");
  }

  if (!blueprint.files || typeof blueprint.files !== "object") {
    throw new Error("Artifact validation failed: projectBlueprint.files is required.");
  }

  return true;
}

export function createGenerationArtifact({ projectId, spec, projectBlueprint, revisions = [] }) {
  validateAppSpec(spec);
  validateProjectBlueprint(projectBlueprint);

  return {
    projectId,
    spec,
    projectBlueprint,
    revisions
  };
}

export function createExportArtifact({ projectId, format = "zip", fileName, downloadUrl }) {
  if (!projectId) {
    throw new Error("Artifact validation failed: projectId is required for export.");
  }

  if (!fileName) {
    throw new Error("Artifact validation failed: fileName is required for export.");
  }

  if (!downloadUrl) {
    throw new Error("Artifact validation failed: downloadUrl is required for export.");
  }

  return {
    projectId,
    format,
    fileName,
    downloadUrl,
    createdAt: new Date().toISOString()
  };
}
