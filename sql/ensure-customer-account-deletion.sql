-- Customer account deletion schema bootstrap
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  address text not null default '',
  avatar_url text not null default '',
  deletion_status text not null default 'active',
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  deletion_reason text,
  recovered_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles
  add column if not exists avatar_url text not null default '',
  add column if not exists deletion_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_scheduled_for timestamptz,
  add column if not exists deletion_reason text,
  add column if not exists recovered_at timestamptz,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'customer_profiles_deletion_status_check'
      and conrelid = 'public.customer_profiles'::regclass
  ) then
    alter table public.customer_profiles
      drop constraint customer_profiles_deletion_status_check;
  end if;
end $$;

alter table public.customer_profiles
  add constraint customer_profiles_deletion_status_check
  check (deletion_status in ('active', 'pending_delete', 'purged'));

create index if not exists customer_profiles_deletion_status_idx
  on public.customer_profiles (deletion_status, deletion_scheduled_for);

create table if not exists public.customer_account_deletion_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  action text not null,
  reason text,
  actor_user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint customer_account_deletion_logs_action_check
    check (action in ('request', 'recover', 'finalize', 'blocked_pending_orders'))
);

create index if not exists customer_account_deletion_logs_customer_idx
  on public.customer_account_deletion_logs (customer_id, created_at desc);

notify pgrst, 'reload schema';
