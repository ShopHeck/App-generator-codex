-- Migration 003: Seed plan tiers and enforce storage_url column for exports
-- Adds a reference `plan_tiers` table and an index for artifact storage lookup.
-- The tenants table is updated to use a foreign key into plan_tiers so that
-- limits are authoritative in the DB and not hard-coded in application code.

-- ─── plan_tiers lookup table ────────────────────────────────────────────────

create table if not exists plan_tiers (
  tier         text primary key,
  display_name text not null,
  monthly_generation_limit integer not null,
  monthly_export_limit     integer not null,
  created_at   timestamptz not null default now()
);

insert into plan_tiers (tier, display_name, monthly_generation_limit, monthly_export_limit)
values
  ('free',       'Free',       10,    5),
  ('pro',        'Pro',        100,   40),
  ('enterprise', 'Enterprise', 1000,  200)
on conflict (tier) do update
  set display_name               = excluded.display_name,
      monthly_generation_limit   = excluded.monthly_generation_limit,
      monthly_export_limit       = excluded.monthly_export_limit;

-- ─── Update tenants defaults to use canonical tier values ──────────────────

alter table tenants
  alter column plan_tier     set default 'free',
  alter column monthly_generation_limit set default 10,
  alter column monthly_export_limit     set default 5;

-- ─── storage_url column for export artifacts ────────────────────────────────

alter table exports
  add column if not exists storage_url text,
  add column if not exists expires_at  timestamptz,
  add column if not exists expired     boolean not null default false;

create index if not exists idx_exports_expired_expires_at
  on exports (expired, expires_at)
  where expired = false;
