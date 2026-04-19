import crypto from "node:crypto";

export const EXPORT_JOB_STATES = Object.freeze({
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed"
});

export function createExportJob({ projectId, maxRetries = 2, ttlMs = 1000 * 60 * 60 } = {}) {
  if (!projectId) {
    throw new Error("projectId is required to create an export job");
  }

  const timestamp = new Date().toISOString();

  return {
    id: `export_${crypto.randomUUID()}`,
    projectId,
    status: EXPORT_JOB_STATES.QUEUED,
    attempts: 0,
    maxRetries,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    error: null,
    file: null
  };
}

export function markExportJobProcessing(job) {
  assertTransition(job, [EXPORT_JOB_STATES.QUEUED]);

  return {
    ...job,
    status: EXPORT_JOB_STATES.PROCESSING,
    attempts: job.attempts + 1,
    updatedAt: new Date().toISOString(),
    error: null
  };
}

export function completeExportJob(job, file) {
  assertTransition(job, [EXPORT_JOB_STATES.PROCESSING]);

  return {
    ...job,
    status: EXPORT_JOB_STATES.COMPLETED,
    updatedAt: new Date().toISOString(),
    file
  };
}

export function failExportJob(job, errorMessage) {
  assertTransition(job, [EXPORT_JOB_STATES.PROCESSING]);

  return {
    ...job,
    status: EXPORT_JOB_STATES.FAILED,
    updatedAt: new Date().toISOString(),
    error: errorMessage
  };
}

export function canRetryExportJob(job) {
  return job.status === EXPORT_JOB_STATES.FAILED && job.attempts <= job.maxRetries;
}

export function queueExportJobRetry(job) {
  if (!canRetryExportJob(job)) {
    throw new Error(`Export job ${job.id} cannot be retried from state ${job.status}`);
  }

  return {
    ...job,
    status: EXPORT_JOB_STATES.QUEUED,
    updatedAt: new Date().toISOString()
  };
}

function assertTransition(job, allowedStates) {
  if (!allowedStates.includes(job.status)) {
    throw new Error(`Export job ${job.id} cannot transition from state ${job.status}`);
  }
}
