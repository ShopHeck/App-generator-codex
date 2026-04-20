export class ProjectRepository {
  constructor({ db }) {
    this.db = db;
  }

  async getById({ tenantId, projectId }) {
    const { rows } = await this.db.query(
      `select id, tenant_id, owner_user_id, name, status, created_at, updated_at
       from projects
       where id = $1 and tenant_id = $2
       limit 1`,
      [projectId, tenantId]
    );

    return rows[0] ?? null;
  }
}
