export class RevisionStore {
  constructor() {
    this.revisionsByProject = new Map();
  }

  saveRevision(projectId, payload, message) {
    if (!projectId) {
      throw new Error("projectId is required to save a revision.");
    }

    const revisions = this.revisionsByProject.get(projectId) ?? [];
    const revision = {
      id: `rev_${revisions.length + 1}`,
      timestamp: new Date().toISOString(),
      message: message || "Pipeline update",
      payload
    };

    revisions.push(revision);
    this.revisionsByProject.set(projectId, revisions);

    return revision;
  }

  listRevisions(projectId) {
    return this.revisionsByProject.get(projectId) ?? [];
  }
}
