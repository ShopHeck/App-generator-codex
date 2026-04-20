/**
 * Structured logger (pino).
 *
 * Export a shared root logger and a factory for child loggers.
 *
 * Usage:
 *   import logger from './src/middleware/logger.js';
 *   logger.info({ userId: 'u1' }, 'Request received');
 *   const childLog = logger.child({ module: 'generation-pipeline' });
 */

import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const transport = isDev
  ? pino.transport({
      target: "pino/file",
      options: { destination: 1 }  // stdout, but with pino-pretty in dev
    })
  : undefined;

const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    base: { service: "app-generator-codex" },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      }
    },
    redact: {
      paths: ["req.headers.authorization", "*.password", "*.token", "*.secret"],
      censor: "[REDACTED]"
    }
  },
  transport
);

export default logger;
