"use client";

import Link from "next/link";
import { useExportProject } from "../../../../lib/api-client";

export default function ExportsPage({ params }: { params: { id: string } }) {
  const { exportsList, exportProject, loading, error } = useExportProject(params.id);

  return (
    <section>
      <h1>Exports</h1>
      <button onClick={() => exportProject("zip")} disabled={loading}>
        {loading ? "Exporting..." : "Create ZIP Export"}
      </button>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      <ul>
        {exportsList.map((item) => (
          <li key={item.downloadUrl}>
            {item.fileName} — <code>{item.downloadUrl}</code>
          </li>
        ))}
      </ul>
      <Link href="/">Back to projects</Link>
    </section>
  );
}
