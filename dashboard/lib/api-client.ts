"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type Project = {
  id: string;
  name: string;
  prompt: string;
  status: "idle" | "queued" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
};

type ProjectPreview = {
  project: Project;
  artifact: {
    projectId: string;
    spec: {
      metadata: { appName: string };
      navigation: { tabs: Array<{ name: string; route: string }> };
    };
    projectBlueprint: {
      projectName: string;
      directories: string[];
      files: Record<string, string>;
    };
    revisions: Array<{ id: string; timestamp: string; message: string }>;
  };
};

type ExportArtifact = {
  projectId: string;
  format: string;
  fileName: string;
  downloadUrl: string;
  createdAt: string;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "Request failed.");
  }

  return data;
}

export function useProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await apiFetch<{ projects: Project[] }>("/projects");
    setProjects(data.projects);
  }, []);

  useEffect(() => {
    refresh().catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }, [refresh]);

  const createProject = useCallback(async ({ name, prompt }: { name: string; prompt: string }) => {
    setCreating(true);
    setError(null);

    const optimisticProject: Project = {
      id: `tmp_${Date.now()}`,
      name,
      prompt,
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects((current) => [optimisticProject, ...current]);

    try {
      const data = await apiFetch<{ project: Project }>("/projects", {
        method: "POST",
        body: JSON.stringify({ name, prompt })
      });

      setProjects((current) => [data.project, ...current.filter((project) => project.id !== optimisticProject.id)]);
    } catch (createError) {
      setProjects((current) => current.filter((project) => project.id !== optimisticProject.id));
      setError((createError as Error).message);
    } finally {
      setCreating(false);
    }
  }, []);

  const triggerGeneration = useCallback(async (projectId: string, prompt: string) => {
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, status: "running" } : project)));

    try {
      await apiFetch(`/projects/${projectId}/generate`, {
        method: "POST",
        body: JSON.stringify({ prompt })
      });
      refresh();
    } catch (generationError) {
      setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, status: "failed" } : project)));
      setError((generationError as Error).message);
    }
  }, [refresh]);

  return { projects, loading, creating, error, createProject, triggerGeneration, refresh };
}

export function useProjectGeneration(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const status = useMemo(() => project?.status ?? "idle", [project?.status]);

  const fetchProject = useCallback(async () => {
    const data = await apiFetch<{ projects: Project[] }>("/projects");
    const selected = data.projects.find((entry) => entry.id === projectId) ?? null;
    setProject(selected);
    return selected;
  }, [projectId]);

  const pollUntilComplete = useCallback(async () => {
    setIsPolling(true);
    try {
      let keepPolling = true;
      while (keepPolling) {
        const current = await fetchProject();
        keepPolling = current?.status === "running" || current?.status === "queued";
        if (keepPolling) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
    } catch (pollError) {
      setError((pollError as Error).message);
    } finally {
      setIsPolling(false);
    }
  }, [fetchProject]);

  useEffect(() => {
    fetchProject().catch((fetchError) => setError(fetchError.message));
  }, [fetchProject]);

  const triggerGeneration = useCallback(async (prompt: string) => {
    setError(null);
    setProject((current) => (current ? { ...current, status: "running", prompt } : current));

    try {
      await apiFetch(`/projects/${projectId}/generate`, {
        method: "POST",
        body: JSON.stringify({ prompt })
      });
      await pollUntilComplete();
    } catch (generationError) {
      setProject((current) => (current ? { ...current, status: "failed" } : current));
      setError((generationError as Error).message);
    }
  }, [pollUntilComplete, projectId]);

  return { project, status, isPolling, error, triggerGeneration };
}

export function useProjectPreview(projectId: string) {
  const [preview, setPreview] = useState<ProjectPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ProjectPreview>(`/projects/${projectId}/preview`)
      .then(setPreview)
      .catch((previewError) => setError(previewError.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  return { preview, loading, error };
}

export function useExportProject(projectId: string) {
  const [exportsList, setExportsList] = useState<ExportArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportProject = useCallback(async (format: "zip" | "tar") => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ artifact: ExportArtifact }>(`/projects/${projectId}/export`, {
        method: "POST",
        body: JSON.stringify({ format })
      });
      setExportsList((current) => [data.artifact, ...current]);
    } catch (exportError) {
      setError((exportError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { exportsList, loading, error, exportProject };
}
