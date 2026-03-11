-- Admin KYC access control + per-user PIN security
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.admin_user_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_view_customer_kyc boolean not null default false,
  kyc_pin_hash text,
  kyc_pin_updated_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_user_security
  add column if not exists can_view_customer_kyc boolean not null default false,
  add column if not exists kyc_pin_hash text,
  add column if not exists kyc_pin_updated_at timestamptz,
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_user_security_failed_attempts_check'
      and conrelid = 'public.admin_user_security'::regclass
  ) then
    alter table public.admin_user_security drop constraint admin_user_security_failed_attempts_check;
  end if;
end $$;

alter table public.admin_user_security
  add constraint admin_user_security_failed_attempts_check
  check (failed_attempts >= 0 and failed_attempts <= 1000);

create index if not exists admin_user_security_kyc_access_idx
  on public.admin_user_security (can_view_customer_kyc, locked_until);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_admin_user_security_updated_at') then
    create trigger set_admin_user_security_updated_at
      before update on public.admin_user_security
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

create table if not exists public.admin_kyc_access_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  status text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_kyc_access_logs
  add column if not exists actor_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists customer_id uuid references auth.users(id) on delete cascade,
  add column if not exists action text not null default 'unknown',
  add column if not exists status text not null default 'unknown',
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_kyc_access_logs_action_check'
      and conrelid = 'public.admin_kyc_access_logs'::regclass
  ) then
    alter table public.admin_kyc_access_logs drop constraint admin_kyc_access_logs_action_check;
  end if;
end $$;

alter table public.admin_kyc_access_logs
  add constraint admin_kyc_access_logs_action_check
  check (action in ('unlock_pin', 'view_kyc', 'download_face', 'failed_pin'));

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'admin_kyc_access_logs_status_check'
      and conrelid = 'public.admin_kyc_access_logs'::regclass
  ) then
    alter table public.admin_kyc_access_logs drop constraint admin_kyc_access_logs_status_check;
  end if;
end $$;

alter table public.admin_kyc_access_logs
  add constraint admin_kyc_access_logs_status_check
  check (status in ('ok', 'denied', 'locked'));

create index if not exists admin_kyc_access_logs_actor_idx
  on public.admin_kyc_access_logs (actor_user_id, created_at desc);

create index if not exists admin_kyc_access_logs_customer_idx
  on public.admin_kyc_access_logs (customer_id, created_at desc);

alter table public.customer_kyc_profiles
  add column if not exists face_image_path text,
  add column if not exists face_captured_at timestamptz;

alter table public.admin_user_security enable row level security;
alter table public.admin_kyc_access_logs enable row level security;

revoke all on table public.admin_user_security from anon, authenticated;
revoke all on table public.admin_kyc_access_logs from anon, authenticated;

notify pgrst, 'reload schema';
