import express from "express";
import pinoHttp from "pino-http";
import { GenerationPipeline } from "../orchestration/generation-pipeline.js";
import { createExportArtifact, createGenerationArtifact, GENERATION_STATUS } from "../domain/artifact-contracts.js";
import {
  createProjectResponse,
  validateCreateProjectRequest,
  validateExportProjectRequest,
  validateGenerateProjectRequest
} from "../domain/project-api-contracts.js";
import { ProjectStore } from "./project-store.js";
import { generalApiLimiter, generationLimiter } from "../middleware/rate-limit.js";
import logger from "../middleware/logger.js";
import { buildAuthMiddleware, buildHmacVerifier, buildJwksVerifier } from "../middleware/auth.js";
import { createTenantRouter } from "./routes/tenants.js";
import { createDbPool } from "../db/client.js";
import { TenantRepository, GenerationRunRepository, ExportRepository } from "../repositories/index.js";

export function createServer({
  projectStore = new ProjectStore(),
  pipeline = new GenerationPipeline(),
  requireAuth = null,
  db = null,
  tenantRepository = null,
  generationRunRepository = null,
  exportRepository = null
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(generalApiLimiter);

  // ── Health check (always public — no auth required) ──────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
  });

  // ── Auth gate: every route registered below requires a valid bearer token ──
  // NOTE: project routes (GET /projects, POST /projects, etc.) and tenant
  // management routes are intentionally protected.  The only public endpoint
  // is GET /health above.  When createServer() is called without requireAuth
  // (e.g. in unit tests or local dev without JWT_SECRET) all routes are open.
  if (requireAuth) {
    app.use(requireAuth);
  }

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

  app.post("/projects/:id/generate", generationLimiter, (req, res) => {
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
        const startMs = Date.now();
        try {
          const output = await pipeline.run({ projectId: project.id, prompt: payload.prompt });
          const artifact = createGenerationArtifact(output);
          projectStore.update(project.id, {
            status: GENERATION_STATUS.completed,
            spec: artifact.spec,
            projectBlueprint: artifact.projectBlueprint,
            revisions: artifact.revisions
          });
          logger.info({ projectId: project.id, durationMs: Date.now() - startMs }, "Generation completed");
        } catch (error) {
          projectStore.update(project.id, {
            status: GENERATION_STATUS.failed,
            lastError: error.message
          });
          logger.error({ projectId: project.id, err: error.message }, "Generation failed");
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

  // ── Tenant management routes (mounted when DB is configured) ────────────
  if (db) {
    app.use(
      "/tenants",
      createTenantRouter({ db, tenantRepository, generationRunRepository, exportRepository })
    );
  }

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 3001);

  // ── Auth middleware ───────────────────────────────────────────────────────
  let requireAuth = null;
  if (process.env.JWT_SECRET) {
    requireAuth = buildAuthMiddleware({
      verifyAccessToken: buildHmacVerifier({ secret: process.env.JWT_SECRET })
    });
    logger.info("Auth mode: HMAC/JWT (JWT_SECRET)");
  } else if (process.env.SUPABASE_URL) {
    const jwksUri = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
    requireAuth = buildAuthMiddleware({
      verifyAccessToken: buildJwksVerifier({ jwksUri })
    });
    logger.info({ jwksUri }, "Auth mode: JWKS (SUPABASE_URL)");
  } else {
    logger.warn(
      "No JWT_SECRET or SUPABASE_URL set — API running without authentication. Set JWT_SECRET for production."
    );
  }

  // ── Database pool + repositories ─────────────────────────────────────────
  let db = null;
  let tenantRepository = null;
  let generationRunRepository = null;
  let exportRepository = null;

  if (process.env.POSTGRES_URL || process.env.POSTGRES_HOST) {
    db = createDbPool();
    tenantRepository = new TenantRepository({ db });
    generationRunRepository = new GenerationRunRepository({ db });
    exportRepository = new ExportRepository({ db });
    logger.info("Database: PostgreSQL pool initialized");
  }

  const app = createServer({ requireAuth, db, tenantRepository, generationRunRepository, exportRepository });
  app.listen(port, () => {
    logger.info({ port }, "API server listening");
  });
}
