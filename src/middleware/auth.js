export function buildAuthMiddleware({ verifyAccessToken }) {
  if (typeof verifyAccessToken !== "function") {
    throw new Error("verifyAccessToken must be provided.");
  }

  return async function requireAuth(req, res, next) {
    try {
      const authorizationHeader = req.headers?.authorization;
      if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid bearer token." });
        return;
      }

      const accessToken = authorizationHeader.slice("Bearer ".length).trim();
      const claims = await verifyAccessToken(accessToken);

      if (!claims?.sub || !claims?.tenantId) {
        res.status(401).json({ error: "Token is missing required claims." });
        return;
      }

      req.auth = {
        userId: claims.sub,
        tenantId: claims.tenantId,
        role: claims.role ?? "member"
      };

      next();
    } catch (error) {
      res.status(401).json({ error: error.message || "Unauthorized." });
    }
  };
}

export function buildProjectTenantScopeMiddleware({ projectRepository, projectIdParam = "projectId" }) {
  if (!projectRepository) {
    throw new Error("projectRepository is required.");
  }

  return async function requireProjectTenantScope(req, res, next) {
    try {
      const tenantId = req.auth?.tenantId;
      const projectId = req.params?.[projectIdParam];

      if (!tenantId || !projectId) {
        res.status(400).json({ error: "Missing tenant or project identifier." });
        return;
      }

      const project = await projectRepository.getById({ tenantId, projectId });
      if (!project) {
        res.status(404).json({ error: "Project not found for current tenant." });
        return;
      }

      req.project = project;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed tenant scope check." });
    }
  };
}
