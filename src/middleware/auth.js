import jwt from "jsonwebtoken";
import { createRemoteJWKSet, importJWK, jwtVerify } from "jose";

/**
 * Build a `verifyAccessToken` function backed by a shared HMAC secret.
 * Use this for environments where you control both signing and verification.
 *
 * @param {object} opts
 * @param {string} opts.secret — JWT signing secret (min 32 chars recommended)
 */
export function buildHmacVerifier({ secret }) {
  if (!secret) {
    throw new Error("buildHmacVerifier requires a secret.");
  }

  return async function verifyAccessToken(token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, { algorithms: ["HS256"] }, (err, decoded) => {
        if (err) return reject(new Error("Token verification failed: " + err.message));
        resolve(decoded);
      });
    });
  };
}

/**
 * Build a `verifyAccessToken` function backed by a JWKS endpoint.
 * Use this to verify Supabase-issued JWTs against their public key set.
 *
 * @param {object} opts
 * @param {string} opts.jwksUri — full JWKS URL,
 *   e.g. https://<project>.supabase.co/auth/v1/.well-known/jwks.json
 * @param {string} [opts.issuer]
 * @param {string} [opts.audience]
 */
export function buildJwksVerifier({ jwksUri, issuer, audience }) {
  if (!jwksUri) {
    throw new Error("buildJwksVerifier requires jwksUri.");
  }

  // Using `jose` for JWKS so no external network call at startup
  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  return async function verifyAccessToken(token) {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience
    });
    return payload;
  };
}

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
