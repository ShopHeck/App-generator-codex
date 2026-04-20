export class TenantRepository {
  constructor({ db }) {
    this.db = db;
  }

  async getPlanLimits({ tenantId }) {
    const { rows } = await this.db.query(
      `select id, plan_tier, monthly_generation_limit, monthly_export_limit
       from tenants
       where id = $1
       limit 1`,
      [tenantId]
    );

    return rows[0] ?? null;
  }
}
