/**
 * Tenant onboarding routes.
 *
 * POST /tenants               — create a new tenant + owner user
 * POST /tenants/:id/users     — invite a user into an existing tenant
 * PUT  /tenants/:id/plan      — update a tenant's plan tier
 * GET  /tenants/:id/usage     — fetch current month usage vs limits
 *
 * All mutating routes require a bearer token with `role: "admin"` or
 * `role: "owner"` inside `req.auth` (populated by buildAuthMiddleware).
 */

import { Router } from "express";
import { z } from "zod";
import { PlanLimitService } from "../../services/plan-limit-service.js";

const VALID_PLAN_TIERS = ["free", "pro", "enterprise"];
const VALID_ROLES = ["admin", "member"];

const CreateTenantSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
  ownerEmail: z.string().email("ownerEmail must be a valid email"),
  ownerName: z.string().trim().optional()
});

const InviteUserSchema = z.object({
  email: z.string().email("email must be a valid email"),
  fullName: z.string().trim().optional(),
  role: z.enum(["admin", "member"]).default("member")
});

const UpdatePlanSchema = z.object({
  plan: z.enum(["free", "pro", "enterprise"])
});

/**
 * @param {object} opts
 * @param {object} opts.db                   — pg.Pool instance
 * @param {object} opts.tenantRepository
 * @param {object} opts.generationRunRepository
 * @param {object} opts.exportRepository
 */
export function createTenantRouter({
  db,
  tenantRepository,
  generationRunRepository,
  exportRepository
}) {
  const router = Router();

  // ── POST /tenants ───────────────────────────────────────────────────────────

  router.post("/", async (req, res) => {
    const parse = CreateTenantSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues });
    }

    const { name, plan, ownerEmail, ownerName } = parse.data;

    try {
      await db.query("BEGIN");

      // Get limits from plan_tiers table
      const { rows: tierRows } = await db.query(
        "select monthly_generation_limit, monthly_export_limit from plan_tiers where tier = $1",
        [plan]
      );
      const tier = tierRows[0] ?? { monthly_generation_limit: 10, monthly_export_limit: 5 };

      // Create tenant
      const { rows: tenantRows } = await db.query(
        `insert into tenants (name, plan_tier, monthly_generation_limit, monthly_export_limit)
         values ($1, $2, $3, $4)
         returning id, name, plan_tier, monthly_generation_limit, monthly_export_limit, created_at`,
        [name, plan, tier.monthly_generation_limit, tier.monthly_export_limit]
      );
      const tenant = tenantRows[0];

      // Create owner user
      const { rows: userRows } = await db.query(
        `insert into users (tenant_id, email, full_name, role)
         values ($1, $2, $3, 'owner')
         returning id, tenant_id, email, full_name, role, created_at`,
        [tenant.id, ownerEmail, ownerName ?? null]
      );
      const owner = userRows[0];

      await db.query("COMMIT");

      return res.status(201).json({ tenant, owner });
    } catch (err) {
      await db.query("ROLLBACK").catch(() => {});
      if (err.code === "23505") {
        return res.status(409).json({ error: "A user with that email already exists." });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // ── POST /tenants/:id/users ─────────────────────────────────────────────────

  router.post("/:id/users", requireAdminOrOwner, async (req, res) => {
    if (req.auth.tenantId !== req.params.id) {
      return res.status(403).json({ error: "Cannot invite users into another tenant." });
    }

    const parse = InviteUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues });
    }

    const { email, fullName, role } = parse.data;

    try {
      const { rows } = await db.query(
        `insert into users (tenant_id, email, full_name, role)
         values ($1, $2, $3, $4)
         returning id, tenant_id, email, full_name, role, created_at`,
        [req.params.id, email, fullName ?? null, role]
      );

      return res.status(201).json({ user: rows[0] });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "User with that email already exists in this tenant." });
      }
      if (err.code === "23503") {
        return res.status(404).json({ error: "Tenant not found." });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  // ── PUT /tenants/:id/plan ───────────────────────────────────────────────────

  router.put("/:id/plan", requireAdminOrOwner, async (req, res) => {
    if (req.auth.tenantId !== req.params.id) {
      return res.status(403).json({ error: "Cannot modify another tenant's plan." });
    }

    const parse = UpdatePlanSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues });
    }

    const { plan } = parse.data;

    try {
      const { rows: tierRows } = await db.query(
        "select monthly_generation_limit, monthly_export_limit from plan_tiers where tier = $1",
        [plan]
      );
      if (!tierRows.length) {
        return res.status(400).json({ error: `Unknown plan tier: ${plan}` });
      }
      const tier = tierRows[0];

      const { rows } = await db.query(
        `update tenants
         set plan_tier = $1,
             monthly_generation_limit = $2,
             monthly_export_limit = $3,
             updated_at = now()
         where id = $4
         returning id, name, plan_tier, monthly_generation_limit, monthly_export_limit, updated_at`,
        [plan, tier.monthly_generation_limit, tier.monthly_export_limit, req.params.id]
      );

      if (!rows.length) {
        return res.status(404).json({ error: "Tenant not found." });
      }

      return res.json({ tenant: rows[0] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── GET /tenants/:id/usage ──────────────────────────────────────────────────

  router.get("/:id/usage", async (req, res) => {
    if (req.auth?.tenantId !== req.params.id) {
      return res.status(403).json({ error: "Cannot view usage of another tenant." });
    }

    try {
      const planLimitService = new PlanLimitService({
        tenantRepository,
        generationRunRepository,
        exportRepository
      });
      const usage = await planLimitService.getCurrentUsage({ tenantId: req.params.id });
      return res.json({ usage });
    } catch (err) {
      if (err.message.includes("Tenant not found")) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

function requireAdminOrOwner(req, res, next) {
  const role = req.auth?.role;
  if (!role || !["admin", "owner"].includes(role)) {
    return res.status(403).json({ error: "Insufficient permissions." });
  }
  next();
}
