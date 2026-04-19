import { GENERATION_STATUS } from "../domain/artifact-contracts.js";

export class ProjectStore {
  constructor() {
    this.projects = new Map();
    this.sequence = 1;
  }

  create({ name, prompt = "", spec = null }) {
    const id = `project_${this.sequence++}`;
    const now = new Date().toISOString();
    const project = {
      id,
      name,
      prompt,
      status: GENERATION_STATUS.idle,
      createdAt: now,
      updatedAt: now,
      spec,
      projectBlueprint: null,
      revisions: [],
      exports: [],
      lastError: null
    };

    this.projects.set(id, project);
    return project;
  }

  list() {
    return [...this.projects.values()];
  }

  get(projectId) {
    return this.projects.get(projectId) ?? null;
  }

  update(projectId, changes) {
    const existing = this.get(projectId);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...changes,
      updatedAt: new Date().toISOString()
    };

    this.projects.set(projectId, updated);
    return updated;
  }
}
