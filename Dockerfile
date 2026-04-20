# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy application source
COPY src ./src
COPY scripts ./scripts

# ── Runtime ────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
EXPOSE 3001

# Run migrations then start the API server
CMD ["sh", "-c", "node scripts/migrate.js && node src/backend/server.js"]
