import crypto from "node:crypto";
import zlib from "node:zlib";
import {
  createExportJob,
  markExportJobProcessing,
  completeExportJob,
  failExportJob,
  canRetryExportJob,
  queueExportJobRetry
} from "../domain/export-job.js";

export class ExportService {
  constructor({ packager = packageArtifactsAsZip } = {}) {
    this.packager = packager;
  }

  createAndProcessJob({ projectId, files, ttlMs, maxRetries } = {}) {
    let job = createExportJob({ projectId, ttlMs, maxRetries });

    while (job.status !== "completed") {
      job = markExportJobProcessing(job);

      try {
        const archive = this.packager({ projectId, files });
        const fileMetadata = buildFileMetadata({ archive, job });
        job = completeExportJob(job, fileMetadata);
      } catch (error) {
        job = failExportJob(job, error.message);

        if (!canRetryExportJob(job)) {
          break;
        }

        job = queueExportJobRetry(job);
      }
    }

    return job;
  }
}

export function packageArtifactsAsZip({ projectId, files } = {}) {
  validateArtifactsInput({ projectId, files });

  const sortedFiles = Object.entries(files)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .map(([path, content]) => ({ path, content }))
    .filter(({ content }) => content !== undefined && content !== null);

  if (sortedFiles.length === 0) {
    throw new Error("No files available to package");
  }

  const payload = JSON.stringify(
    {
      projectId,
      generatedAt: new Date().toISOString(),
      files: sortedFiles
    },
    null,
    2
  );

  return zlib.gzipSync(payload);
}

function buildFileMetadata({ archive, job }) {
  const checksum = crypto.createHash("sha256").update(archive).digest("hex");

  return {
    id: `artifact_${crypto.randomUUID()}`,
    size: archive.byteLength,
    checksum,
    expiresAt: job.expiresAt
  };
}

function validateArtifactsInput({ projectId, files }) {
  if (!projectId) {
    throw new Error("projectId is required for export packaging");
  }

  if (!files || typeof files !== "object") {
    throw new Error("files map is required for export packaging");
  }
}
