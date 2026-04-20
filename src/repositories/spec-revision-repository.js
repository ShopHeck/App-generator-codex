export class SpecRevisionRepository {
  constructor({ db }) {
    this.db = db;
  }

  async create({ tenantId, projectId, userId, revisionType, payload, message }) {
    const { rows } = await this.db.query(
      `insert into spec_revisions
       (tenant_id, project_id, created_by_user_id, revision_type, payload, message)
       values ($1, $2, $3, $4, $5::jsonb, $6)
       returning id, tenant_id, project_id, created_by_user_id, revision_type, payload, message, created_at`,
      [tenantId, projectId, userId, revisionType, JSON.stringify(payload), message]
    );

    return rows[0];
  }

  async listByProject({ tenantId, projectId }) {
    const { rows } = await this.db.query(
      `select id, tenant_id, project_id, created_by_user_id, revision_type, payload, message, created_at
       from spec_revisions
       where tenant_id = $1 and project_id = $2
       order by created_at desc`,
      [tenantId, projectId]
    );

    return rows;
  }
}
