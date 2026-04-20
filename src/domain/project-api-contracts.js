import { z } from "zod";
import { validateAppSpec } from "./app-spec.js";

// ─── Request schemas ──────────────────────────────────────────────────────────

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  prompt: z.string().trim().default(""),
  spec: z.unknown().optional().nullable()
});

const GenerateProjectSchema = z.object({
  prompt: z.string().trim().min(20, "prompt must be at least 20 characters")
});

const ExportProjectSchema = z.object({
  format: z.enum(["zip", "tar"]).default("zip")
});

// ─── Validated request factories ─────────────────────────────────────────────

export function validateCreateProjectRequest(payload) {
  const result = CreateProjectSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Request validation failed: " + result.error.issues.map((i) => i.message).join("; "));
  }

  const { name, prompt, spec } = result.data;

  if (spec) {
    validateAppSpec(spec);
  }

  return { name, prompt, spec: spec ?? null };
}

export function validateGenerateProjectRequest(payload) {
  const result = GenerateProjectSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Request validation failed: " + result.error.issues.map((i) => i.message).join("; "));
  }

  return { prompt: result.data.prompt };
}

export function validateExportProjectRequest(payload) {
  const result = ExportProjectSchema.safeParse(payload);
  if (!result.success) {
    throw new Error("Request validation failed: " + result.error.issues.map((i) => i.message).join("; "));
  }

  return { format: result.data.format };
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

