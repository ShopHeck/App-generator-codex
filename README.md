# App-generator-codex

Backend-first generation pipeline scaffold for turning plain-English prompts into structured iOS app specs and export-ready project blueprints.

## Implemented workflow slice

1. Prompt intake + validation
2. Prompt intent extraction
3. Structured app-spec generation
4. iOS project blueprint assembly
5. Persisted revision history via repository layer
6. Tenant-scoped generation tracking + subscription plan limits

## Data model (Postgres / Supabase)

The repository includes a Supabase-compatible SQL schema under `src/repositories/sql/schema.sql` with tables:

- `tenants`
- `users`
- `projects`
- `spec_revisions`
- `generation_runs`
- `exports`

## Run

```bash
npm test
npm run generate:demo
```
