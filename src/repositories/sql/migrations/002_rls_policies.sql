-- Migration 002: Row-Level Security policies
-- Enable RLS on all tenant-scoped tables and restrict access so each
-- authenticated user can only see rows belonging to their own tenant.
-- Supabase sets auth.uid() from the JWT `sub` claim; we store tenant_id
-- in JWT custom claims and expose it via auth.jwt()->>'tenantId'.

-- Some environments (local CI Postgres) do not provide Supabase's auth schema.
-- Create a minimal compatibility shim so policy creation does not fail.
do $$
begin
  create schema if not exists auth;

  if to_regprocedure('auth.jwt()') is null then
    execute $fn$
      create function auth.jwt()
      returns jsonb
      language sql
      stable
      as $inner$
        -- Fail-closed default: returning {} means tenantId is absent, so
        -- checks like `tenant_id::text = auth.jwt() ->> 'tenantId'` become
        -- `tenant_id::text = null`, which evaluates to false.
        select coalesce(
          nullif(current_setting('request.jwt.claims', true), '')::jsonb,
          '{}'::jsonb
        )
      $inner$;
    $fn$;
  end if;
end
$$;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

alter table tenants           enable row level security;
alter table users             enable row level security;
alter table projects          enable row level security;
alter table spec_revisions    enable row level security;
alter table generation_runs   enable row level security;
alter table exports           enable row level security;

-- ─── tenants ────────────────────────────────────────────────────────────────
-- A tenant row is readable only by members of that tenant.

create policy "tenants: members can read own tenant" on tenants
  for select
  using (id::text = auth.jwt() ->> 'tenantId');

-- ─── users ──────────────────────────────────────────────────────────────────

create policy "users: members see users in own tenant" on users
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "users: service role can insert" on users
  for insert
  with check (true);  -- enforced at application layer / service-role bypass

-- ─── projects ───────────────────────────────────────────────────────────────

create policy "projects: tenant members can read" on projects
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "projects: tenant members can insert" on projects
  for insert
  with check (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "projects: owner or service role can update" on projects
  for update
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "projects: owner or service role can delete" on projects
  for delete
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

-- ─── spec_revisions ─────────────────────────────────────────────────────────

create policy "spec_revisions: tenant members can read" on spec_revisions
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "spec_revisions: tenant members can insert" on spec_revisions
  for insert
  with check (tenant_id::text = auth.jwt() ->> 'tenantId');

-- ─── generation_runs ────────────────────────────────────────────────────────

create policy "generation_runs: tenant members can read" on generation_runs
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "generation_runs: tenant members can insert" on generation_runs
  for insert
  with check (tenant_id::text = auth.jwt() ->> 'tenantId');

-- ─── exports ────────────────────────────────────────────────────────────────

create policy "exports: tenant members can read" on exports
  for select
  using (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "exports: tenant members can insert" on exports
  for insert
  with check (tenant_id::text = auth.jwt() ->> 'tenantId');

create policy "exports: tenant members can update" on exports
  for update
  using (tenant_id::text = auth.jwt() ->> 'tenantId');
