/**
 * Export expiry worker.
 *
 * Runs a periodic sweep that:
 *  1. Queries the `exports` table for rows where `expires_at <= now()` and
 *     `expired = false`.
 *  2. Attempts to delete the artifact from Supabase Storage.
 *  3. Marks the export row as `expired = true` in the database.
 *
 * This module exports `startExportExpiryWorker(opts)` which returns a
 * cleanup function to stop the timer.
 *
 * Usage (in your server entry-point):
 *   import { startExportExpiryWorker } from './src/workers/export-expiry-worker.js';
 *   const stop = startExportExpiryWorker({ db, storageService });
 *   // on graceful shutdown:
 *   stop();
 */

import logger from "../middleware/logger.js";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_BATCH_SIZE = 50;

/**
 * @param {object}  opts
 * @param {object}  opts.db               — pg.Pool instance
 * @param {object}  opts.storageService   — StorageService instance
 * @param {number}  [opts.intervalMs]     — sweep interval (default 10 min)
 * @param {number}  [opts.batchSize]      — rows to process per sweep (default 50)
 * @returns {Function} stop — call to cancel the interval
 */
export function startExportExpiryWorker({
  db,
  storageService,
  intervalMs = DEFAULT_INTERVAL_MS,
  batchSize = DEFAULT_BATCH_SIZE
}) {
  const workerLog = logger.child({ module: "export-expiry-worker" });

  async function runSweep() {
    workerLog.info("Starting expiry sweep...");

    let swept = 0;
    let errors = 0;

    try {
      const { rows } = await db.query(
        `select id, storage_path
         from exports
         where expired = false
           and expires_at <= now()
         order by expires_at asc
         limit $1`,
        [batchSize]
      );

      if (rows.length === 0) {
        workerLog.info("No expired exports found.");
        return;
      }

      for (const row of rows) {
        try {
          if (row.storage_path) {
            await storageService.delete(row.storage_path);
          }

          await db.query(
            `update exports set expired = true where id = $1`,
            [row.id]
          );

          swept++;
        } catch (err) {
          errors++;
          workerLog.error({ exportId: row.id, err: err.message }, "Failed to expire export.");
        }
      }
    } catch (err) {
      workerLog.error({ err: err.message }, "Expiry sweep query failed.");
    }

    workerLog.info({ swept, errors }, "Expiry sweep complete.");
  }

  // Run immediately on start, then on interval
  runSweep();
  const timer = setInterval(runSweep, intervalMs);

  return function stop() {
    clearInterval(timer);
    workerLog.info("Export expiry worker stopped.");
  };
}
