# App Generator Codex

[![CI](https://github.com/ShopHeck/App-generator-codex/actions/workflows/ci.yml/badge.svg)](https://github.com/ShopHeck/App-generator-codex/actions/workflows/ci.yml)

Backend-first generation pipeline for turning plain-English prompts into structured iOS app specifications, preview bundles, and project blueprints.

## Pipeline stages

1. Prompt normalization and validation
2. Domain-aware intent extraction (LLM service with heuristic fallback)
3. AppSpec generation (domain blueprints, screens, data models, integrations)
4. AppSpec schema validation (versioning + structured errors)
5. iOS SwiftUI project blueprint generation (pluggable generator registry)
6. Preview bundle generation (screens, components, routes, sample data)
7. Export job packaging (gzip artifact with checksum and retry lifecycle)
8. Revision persistence (typed revisions: spec, preview_bundle, blueprint)
9. Tenant-scoped tracking (plan limits, generation run records, auth middleware)

## Data model (Postgres / Supabase)

The repository layer (`src/repositories/`) and schema (`src/repositories/sql/schema.sql`) define:

- `tenants` — subscription plan limits and billing tier
- `users` — tenant members
- `projects` — tenant-scoped app projects
- `spec_revisions` — immutable snapshots of specs and blueprints
- `generation_runs` — audit log of every pipeline invocation
- `exports` — artifact records tied to generation runs

## Quick start

```bash
npm install
npm test               # run unit tests
npm run generate:demo  # run pipeline demo
npm run start:api      # start REST API server (port 3001)
npm run dashboard      # start internal builder UI (http://127.0.0.1:4173)
```

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | /projects | List all projects |
| POST | /projects | Create a project |
| POST | /projects/:id/generate | Trigger generation |
| GET | /projects/:id/preview | Fetch preview |
| POST | /projects/:id/export | Create export artifact |

## Internal dashboard

The lightweight builder UI (`dashboard/`) runs locally with `npm run dashboard`. It provides a three-panel interface: prompt input + history, live preview, and AppSpec JSON viewer.

## Architecture

```
src/
├── domain/         — AppSpec types, schemas, export job lifecycle, preview bundle
├── generators/     — Pluggable generator registry (ios_swiftui target)
├── services/       — LLM intent service, spec generator, preview generator, export service, plan limits
├── orchestration/  — GenerationPipeline, demo runner, dashboard server
├── revisions/      — In-memory RevisionStore (for non-tenant mode)
├── repositories/   — Postgres repository layer (tenant-scoped persistence)
├── middleware/     — Auth middleware (bearer token + tenant claim)
└── backend/        — Express REST API server + ProjectStore
```
