import test from "node:test";
import assert from "node:assert/strict";
import { buildAuthMiddleware, buildProjectTenantScopeMiddleware } from "../src/middleware/auth.js";

function createResponseCollector() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

test("auth middleware hydrates req.auth", async () => {
  const middleware = buildAuthMiddleware({
    async verifyAccessToken() {
      return { sub: "user_1", tenantId: "tenant_1", role: "admin" };
    }
  });

  const req = { headers: { authorization: "Bearer token" } };
  const res = createResponseCollector();
  let nextCalled = false;

  await middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.auth, { userId: "user_1", tenantId: "tenant_1", role: "admin" });
});

test("project scope middleware enforces tenant ownership", async () => {
  const middleware = buildProjectTenantScopeMiddleware({
    projectRepository: {
      async getById({ tenantId }) {
        if (tenantId === "tenant_1") {
          return { id: "project_1", tenant_id: "tenant_1" };
        }

        return null;
      }
    }
  });

  const req = {
    auth: { tenantId: "tenant_2" },
    params: { projectId: "project_1" }
  };
  const res = createResponseCollector();

  await middleware(req, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /Project not found/);
});
