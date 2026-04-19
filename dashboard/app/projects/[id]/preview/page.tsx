"use client";

import Link from "next/link";
import { useProjectPreview } from "../../../../lib/api-client";

export default function PreviewPage({ params }: { params: { id: string } }) {
  const { preview, loading, error } = useProjectPreview(params.id);

  return (
    <section>
      <h1>Preview</h1>
      {loading ? <p>Loading preview...</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {preview ? (
        <>
          <p>App: {preview.artifact.spec.metadata.appName}</p>
          <p>Tabs: {preview.artifact.spec.navigation.tabs.map((tab) => tab.name).join(", ")}</p>
          <p>Generated files: {Object.keys(preview.artifact.projectBlueprint.files).length}</p>
        </>
      ) : null}
      <Link href="/">Back to projects</Link>
    </section>
  );
}
