"use client";

import Link from "next/link";
import { useProjectsDashboard } from "../lib/api-client";

export default function ProjectsPage() {
  const { projects, createProject, triggerGeneration, creating, loading, error } = useProjectsDashboard();

  async function onCreate(formData: FormData) {
    const name = String(formData.get("name") ?? "");
    const prompt = String(formData.get("prompt") ?? "");
    await createProject({ name, prompt });
  }

  return (
    <section>
      <h1>Projects</h1>
      <p style={{ marginTop: 0 }}>Launch app builds fast, monitor generation status, and export artifacts.</p>

      <form action={onCreate} style={{ display: "grid", gap: 8, background: "white", padding: 16, borderRadius: 12 }}>
        <input name="name" placeholder="Project name" required style={{ padding: 10 }} />
        <textarea name="prompt" placeholder="Describe the app you want to generate" rows={4} style={{ padding: 10 }} />
        <button type="submit" disabled={creating} style={{ width: 180, padding: "10px 14px" }}>
          {creating ? "Creating..." : "Create Project"}
        </button>
      </form>

      {loading ? <p>Loading projects...</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 20, display: "grid", gap: 12 }}>
        {projects.map((project) => (
          <li key={project.id} style={{ background: "white", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{project.name}</strong>
                <p style={{ margin: "6px 0" }}>Status: {project.status}</p>
              </div>
              <button onClick={() => triggerGeneration(project.id, project.prompt)} style={{ padding: "8px 12px" }}>
                Generate
              </button>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href={`/projects/${project.id}/builder`}>Builder</Link>
              <Link href={`/projects/${project.id}/preview`}>Preview</Link>
              <Link href={`/projects/${project.id}/exports`}>Exports</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
