import test from "node:test";
import assert from "node:assert/strict";
import { PlanLimitService } from "../src/services/plan-limit-service.js";

test("plan limit service returns usage and limits", async () => {
  const service = new PlanLimitService({
    tenantRepository: {
      async getPlanLimits() {
        return {
          id: "tenant_1",
          plan_tier: "pro",
          monthly_generation_limit: 100,
          monthly_export_limit: 40
        };
      }
    },
    generationRunRepository: {
      async countForCurrentMonth() {
        return 12;
      }
    },
    exportRepository: {
      async countForCurrentMonth() {
        return 5;
      }
    }
  });

  const usage = await service.getCurrentUsage({ tenantId: "tenant_1" });
  assert.equal(usage.planTier, "pro");
  assert.equal(usage.generationCount, 12);
  assert.equal(usage.exportCount, 5);
});

test("plan limit service blocks overages", async () => {
  const service = new PlanLimitService({
    tenantRepository: {
      async getPlanLimits() {
        return {
          id: "tenant_1",
          plan_tier: "starter",
          monthly_generation_limit: 1,
          monthly_export_limit: 0
        };
      }
    },
    generationRunRepository: {
      async countForCurrentMonth() {
        return 1;
      }
    },
    exportRepository: {
      async countForCurrentMonth() {
        return 0;
      }
    }
  });

  await assert.rejects(() => service.assertGenerationAllowed({ tenantId: "tenant_1" }), /limit reached/);
  await assert.rejects(() => service.assertExportAllowed({ tenantId: "tenant_1" }), /limit reached/);
});
