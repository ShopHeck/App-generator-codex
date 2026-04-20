/**
 * Express rate-limit middleware factory.
 *
 * Provides two pre-configured limiters:
 *  - `generalApiLimiter`   — broad API protection (all routes)
 *  - `generationLimiter`   — tighter limit on the expensive generation endpoint
 *
 * In both cases the rate-limit key is per-tenant (from req.auth.tenantId)
 * when available, falling back to the remote IP.
 */

import rateLimit from "express-rate-limit";

function tenantOrIpKey(req) {
  return req.auth?.tenantId ?? req.ip ?? "unknown";
}

/**
 * General API rate limiter: 300 requests / 60s per tenant.
 * Applied globally to all API routes.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: tenantOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." }
});

/**
 * Generation endpoint limiter: 10 generation requests / 60s per tenant.
 * Applied only to POST /projects/:id/generate.
 */
export const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: tenantOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Generation rate limit exceeded. Please wait before submitting another request." }
});
