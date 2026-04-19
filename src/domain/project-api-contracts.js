import { validateAppSpec } from "./app-spec.js";

export function validateCreateProjectRequest(payload) {
  if (!payload?.name || typeof payload.name !== "string") {
    throw new Error("Request validation failed: name is required.");
  }

  if (payload.spec) {
    validateAppSpec(payload.spec);
  }

  return {
    name: payload.name.trim(),
    prompt: (payload.prompt ?? "").trim(),
    spec: payload.spec ?? null
  };
}

export function validateGenerateProjectRequest(payload) {
  if (!payload?.prompt || typeof payload.prompt !== "string") {
    throw new Error("Request validation failed: prompt is required.");
  }

  return { prompt: payload.prompt.trim() };
}

export function validateExportProjectRequest(payload) {
  const format = payload?.format ?? "zip";
  if (!["zip", "tar"].includes(format)) {
    throw new Error("Request validation failed: format must be zip or tar.");
  }

  return { format };
}

export function createProjectResponse(project) {
  return {
    id: project.id,
    name: project.name,
    prompt: project.prompt,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}
