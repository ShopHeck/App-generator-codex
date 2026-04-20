create extension if not exists "pgcrypto";

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_tier text not null default 'starter',
  monthly_generation_limit integer not null default 50,
  monthly_export_limit integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  owner_user_id uuid references users(id) on delete set null,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists spec_revisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  created_by_user_id uuid references users(id) on delete set null,
  revision_type text not null,
  message text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists generation_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  triggered_by_user_id uuid references users(id) on delete set null,
  status text not null,
  prompt text not null,
  normalized_prompt text not null,
  model text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  generated_by_user_id uuid references users(id) on delete set null,
  format text not null,
  storage_path text,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_tenant_id on projects (tenant_id);
create index if not exists idx_spec_revisions_project_created_at on spec_revisions (project_id, created_at desc);
create index if not exists idx_generation_runs_tenant_created_at on generation_runs (tenant_id, created_at desc);
create index if not exists idx_exports_tenant_created_at on exports (tenant_id, created_at desc);
