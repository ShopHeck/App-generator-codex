import express from "express";
import { GenerationPipeline } from "../orchestration/generation-pipeline.js";
import { createExportArtifact, createGenerationArtifact, GENERATION_STATUS } from "../domain/artifact-contracts.js";
import {
  createProjectResponse,
  validateCreateProjectRequest,
  validateExportProjectRequest,
  validateGenerateProjectRequest
} from "../domain/project-api-contracts.js";
import { ProjectStore } from "./project-store.js";

export function createServer({ projectStore = new ProjectStore(), pipeline = new GenerationPipeline() } = {}) {
  const app = express();
  app.use(express.json());

  app.get("/projects", (_req, res) => {
    res.json({ projects: projectStore.list().map(createProjectResponse) });
  });

  app.post("/projects", (req, res) => {
    try {
      const payload = validateCreateProjectRequest(req.body);
      const project = projectStore.create(payload);
      res.status(201).json({ project: createProjectResponse(project) });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/projects/:id/generate", (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    try {
      const payload = validateGenerateProjectRequest(req.body);
      projectStore.update(project.id, {
        prompt: payload.prompt,
        status: GENERATION_STATUS.running,
        lastError: null
      });

      setImmediate(async () => {
        try {
          const output = await pipeline.run({ projectId: project.id, prompt: payload.prompt });
          const artifact = createGenerationArtifact(output);
          projectStore.update(project.id, {
            status: GENERATION_STATUS.completed,
            spec: artifact.spec,
            projectBlueprint: artifact.projectBlueprint,
            revisions: artifact.revisions
          });
        } catch (error) {
          projectStore.update(project.id, {
            status: GENERATION_STATUS.failed,
            lastError: error.message
          });
        }
      });

      return res.status(202).json({
        project: createProjectResponse(projectStore.get(project.id)),
        generation: { status: GENERATION_STATUS.running }
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get("/projects/:id/preview", (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (!project.spec || !project.projectBlueprint) {
      return res.status(409).json({
        error: "Preview is not ready.",
        generation: { status: project.status, lastError: project.lastError }
      });
    }

    return res.json({
      project: createProjectResponse(project),
      artifact: createGenerationArtifact({
        projectId: project.id,
        spec: project.spec,
        projectBlueprint: project.projectBlueprint,
        revisions: project.revisions
      })
    });
  });

  app.post("/projects/:id/export", (req, res) => {
    const project = projectStore.get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    if (!project.projectBlueprint) {
      return res.status(409).json({ error: "Generate a project before exporting." });
    }

    try {
      const { format } = validateExportProjectRequest(req.body);
      const exportArtifact = createExportArtifact({
        projectId: project.id,
        format,
        fileName: `${project.projectBlueprint.projectName}.${format}`,
        downloadUrl: `/downloads/${project.id}/${Date.now()}.${format}`
      });

      const updated = projectStore.update(project.id, {
        exports: [...project.exports, exportArtifact]
      });

      return res.status(201).json({ project: createProjectResponse(updated), artifact: exportArtifact });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 3001);
  const app = createServer();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on :${port}`);
  });
}
