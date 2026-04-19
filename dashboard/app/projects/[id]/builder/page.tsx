"use client";

import Link from "next/link";
import { useProjectGeneration } from "../../../../lib/api-client";

export default function BuilderPage({ params }: { params: { id: string } }) {
  const { project, status, isPolling, error, triggerGeneration } = useProjectGeneration(params.id);

  return (
    <section>
      <h1>Builder</h1>
      <p>Project: {project?.name ?? params.id}</p>
      <p>Generation status: {status}</p>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <button onClick={() => triggerGeneration(project?.prompt ?? "Build a profitable SaaS app")}>Generate Now</button>
      <p>{isPolling ? "Polling generation status..." : "Idle"}</p>
      <Link href="/">Back to projects</Link>
    </section>
  );
}
