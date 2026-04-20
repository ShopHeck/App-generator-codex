export class ExportRepository {
  constructor({ db }) {
    this.db = db;
  }

  async create({ tenantId, projectId, userId, format, storagePath = null }) {
    const { rows } = await this.db.query(
      `insert into exports
       (tenant_id, project_id, generated_by_user_id, format, storage_path)
       values ($1, $2, $3, $4, $5)
       returning id, tenant_id, project_id, generated_by_user_id, format, storage_path, created_at`,
      [tenantId, projectId, userId, format, storagePath]
    );

    return rows[0];
  }

  async countForCurrentMonth({ tenantId }) {
    const { rows } = await this.db.query(
      `select count(*)::int as total
       from exports
       where tenant_id = $1
         and created_at >= date_trunc('month', now())
         and created_at < (date_trunc('month', now()) + interval '1 month')`,
      [tenantId]
    );

    return rows[0]?.total ?? 0;
  }
}
