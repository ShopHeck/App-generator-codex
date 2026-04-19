export class GenerationRunRepository {
  constructor({ db }) {
    this.db = db;
  }

  async create({ tenantId, projectId, userId, status, prompt, normalizedPrompt, model = null, errorMessage = null }) {
    const { rows } = await this.db.query(
      `insert into generation_runs
       (tenant_id, project_id, triggered_by_user_id, status, prompt, normalized_prompt, model, error_message)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, tenant_id, project_id, triggered_by_user_id, status, prompt, normalized_prompt, model, error_message, created_at`,
      [tenantId, projectId, userId, status, prompt, normalizedPrompt, model, errorMessage]
    );

    return rows[0];
  }

  async countForCurrentMonth({ tenantId }) {
    const { rows } = await this.db.query(
      `select count(*)::int as total
       from generation_runs
       where tenant_id = $1
         and created_at >= date_trunc('month', now())
         and created_at < (date_trunc('month', now()) + interval '1 month')`,
      [tenantId]
    );

    return rows[0]?.total ?? 0;
  }
}
