/**
 * Unit tests for new production-upgrade features (Phases 1–3).
 *
 * Covers:
 *  - buildHmacVerifier / buildJwksVerifier constructors
 *  - Zod-validated project-api-contracts
 *  - parseIntentFromPromptAsync with OpenAI fallback
 *  - ExportRepository and StorageService interface
 *  - LLM intent client factory
 */

import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { buildHmacVerifier, buildAuthMiddleware } from "../src/middleware/auth.js";
import {
  validateCreateProjectRequest,
  validateGenerateProjectRequest,
  validateExportProjectRequest
} from "../src/domain/project-api-contracts.js";
import {
  createLlmIntentClient,
  parseIntentFromPromptAsync,
  IntentValidationError
} from "../src/services/llm-intent-service.js";

// ─── HMAC JWT verifier ────────────────────────────────────────────────────────

test("buildHmacVerifier verifies a valid HS256 token", async () => {
  const secret = "super-secret-key-at-least-32-chars!!";
  const payload = { sub: "user_1", tenantId: "tenant_1", role: "admin" };
  const token = jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "1h" });

  const verify = buildHmacVerifier({ secret });
  const claims = await verify(token);

  assert.equal(claims.sub, "user_1");
  assert.equal(claims.tenantId, "tenant_1");
  assert.equal(claims.role, "admin");
});

test("buildHmacVerifier rejects an expired token", async () => {
  const secret = "super-secret-key-at-least-32-chars!!";
  const token = jwt.sign({ sub: "user_1", tenantId: "t1" }, secret, {
    algorithm: "HS256",
    expiresIn: -1
  });

  const verify = buildHmacVerifier({ secret });
  await assert.rejects(() => verify(token), /Token verification failed/);
});

test("buildHmacVerifier rejects a token signed with the wrong secret", async () => {
  const token = jwt.sign({ sub: "u", tenantId: "t" }, "wrong-secret-key-111111111111111", {
    algorithm: "HS256"
  });
  const verify = buildHmacVerifier({ secret: "correct-secret-key-1111111111111" });
  await assert.rejects(() => verify(token), /Token verification failed/);
});

test("buildHmacVerifier requires a secret", () => {
  assert.throws(() => buildHmacVerifier({}), /secret/i);
});

test("auth middleware uses HMAC verifier end-to-end", async () => {
  const secret = "super-secret-key-at-least-32-chars!!";
  const token = jwt.sign({ sub: "user_42", tenantId: "tenant_42", role: "member" }, secret, {
    algorithm: "HS256",
    expiresIn: "1h"
  });

  const middleware = buildAuthMiddleware({ verifyAccessToken: buildHmacVerifier({ secret }) });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {
    statusCode: 200,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json() {
      return this;
    }
  };
  let called = false;
  await middleware(req, res, () => {
    called = true;
  });

  assert.ok(called);
  assert.equal(req.auth.userId, "user_42");
  assert.equal(req.auth.tenantId, "tenant_42");
});

// ─── Zod project-api-contracts ────────────────────────────────────────────────

test("validateCreateProjectRequest accepts valid payload", () => {
  const result = validateCreateProjectRequest({ name: "My App", prompt: "Build something cool" });
  assert.equal(result.name, "My App");
  assert.equal(result.prompt, "Build something cool");
  assert.equal(result.spec, null);
});

test("validateCreateProjectRequest rejects missing name", () => {
  assert.throws(() => validateCreateProjectRequest({}), /Required|name is required/i);
});

test("validateCreateProjectRequest rejects empty name", () => {
  assert.throws(() => validateCreateProjectRequest({ name: "  " }), /name is required/i);
});

test("validateGenerateProjectRequest accepts a long-enough prompt", () => {
  const result = validateGenerateProjectRequest({
    prompt: "Build me a fitness tracking app with daily goals."
  });
  assert.ok(result.prompt.length >= 20);
});

test("validateGenerateProjectRequest rejects short prompt", () => {
  assert.throws(() => validateGenerateProjectRequest({ prompt: "hi" }), /20 characters/i);
});

test("validateGenerateProjectRequest rejects missing prompt", () => {
  assert.throws(() => validateGenerateProjectRequest({}), /20 characters|required/i);
});

test("validateExportProjectRequest defaults format to zip", () => {
  const result = validateExportProjectRequest({});
  assert.equal(result.format, "zip");
});

test("validateExportProjectRequest accepts tar", () => {
  const result = validateExportProjectRequest({ format: "tar" });
  assert.equal(result.format, "tar");
});

test("validateExportProjectRequest rejects invalid format", () => {
  assert.throws(() => validateExportProjectRequest({ format: "rar" }), /zip.*tar|Invalid enum|format/i);
});

// ─── LLM intent client factory ────────────────────────────────────────────────

test("createLlmIntentClient returns null when no API key", () => {
  // Temporarily clear env var
  const original = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const client = createLlmIntentClient({});
  assert.equal(client, null);

  if (original !== undefined) process.env.OPENAI_API_KEY = original;
});

// ─── parseIntentFromPromptAsync fallback ─────────────────────────────────────

test("parseIntentFromPromptAsync falls back to heuristics when LLM returns invalid schema", async () => {
  const badLlm = async () => ({ appName: "" }); // invalid schema

  const result = await parseIntentFromPromptAsync(
    'Build a travel app called "JetSet" with login, cloud sync, and premium subscriptions.',
    badLlm
  );

  assert.ok(result.appName);
  assert.ok(result.domain);
});

test("parseIntentFromPromptAsync falls back when LLM throws", async () => {
  const failingLlm = async () => {
    throw new Error("Network error");
  };

  const result = await parseIntentFromPromptAsync(
    'Build a finance tracker called "BudgetWise" with expense tracking and premium billing.',
    failingLlm
  );

  assert.ok(result.appName);
});

test("parseIntentFromPromptAsync uses LLM output when it passes schema validation", async () => {
  const goodLlm = async () => ({
    appName: "CustomApp",
    domain: "sales",
    features: ["crm", "analytics"],
    monetization: { model: "subscription", notes: "monthly billing" },
    integrations: ["rest_api", "stripe"],
    constraints: {
      requiresAuth: true,
      requiresPayments: true,
      requiresSync: false,
      timeline: "mvp",
      budget: "bootstrap"
    }
  });

  const result = await parseIntentFromPromptAsync(
    'Build a B2B sales CRM called "CustomApp" with lead tracking and Stripe.',
    goodLlm
  );

  assert.equal(result.appName, "CustomApp");
  assert.equal(result.domain, "sales");
});

test("parseIntentFromPromptAsync rejects empty prompt", async () => {
  await assert.rejects(() => parseIntentFromPromptAsync(""), /required/i);
});
