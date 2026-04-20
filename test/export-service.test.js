import test from "node:test";
import assert from "node:assert/strict";
import { ExportService } from "../src/services/export-service.js";

test("export service marks job failed after packaging retries are exhausted", () => {
  let attempts = 0;
  const exportService = new ExportService({
    packager: () => {
      attempts += 1;
      throw new Error("Packaging crashed");
    }
  });

  const job = exportService.createAndProcessJob({
    projectId: "project_failure",
    files: { "Demo/README.md": "content" },
    maxRetries: 1
  });

  assert.equal(attempts, 2);
  assert.equal(job.status, "failed");
  assert.equal(job.attempts, 2);
  assert.equal(job.error, "Packaging crashed");
  assert.equal(job.file, null);
});

test("export service retries and completes when packaging recovers", () => {
  let attempts = 0;
  const exportService = new ExportService({
    packager: () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error("Temporary packaging error");
      }

      return Buffer.from("zip-content");
    }
  });

  const job = exportService.createAndProcessJob({
    projectId: "project_recovery",
    files: { "Demo/README.md": "content" },
    maxRetries: 2
  });

  assert.equal(attempts, 2);
  assert.equal(job.status, "completed");
  assert.equal(job.attempts, 2);
  assert.ok(job.file?.id);
  assert.equal(job.file?.size, Buffer.byteLength("zip-content"));
  assert.ok(job.file?.checksum);
  assert.ok(job.file?.expiresAt);
});
