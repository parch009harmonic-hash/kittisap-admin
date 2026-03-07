-- Customer KYC + biometric session foundation
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

create table if not exists public.customer_kyc_profiles (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  kyc_status text not null default 'not_started',
  kyc_level text not null default 'none',
  approved_at timestamptz,
  rejected_reason text,
  provider text not null default '',
  provider_subject_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_kyc_profiles
  add column if not exists kyc_status text not null default 'not_started',
  add column if not exists kyc_level text not null default 'none',
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_reason text,
  add column if not exists provider text not null default '',
  add column if not exists provider_subject_ref text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'customer_kyc_profiles_status_check'
      and conrelid = 'public.customer_kyc_profiles'::regclass
  ) then
    alter table public.customer_kyc_profiles drop constraint customer_kyc_profiles_status_check;
  end if;
end $$;

alter table public.customer_kyc_profiles
  add constraint customer_kyc_profiles_status_check
  check (kyc_status in ('not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'blocked'));

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_customer_kyc_profiles_updated_at') then
    create trigger set_customer_kyc_profiles_updated_at
      before update on public.customer_kyc_profiles
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

create index if not exists customer_kyc_profiles_status_idx
  on public.customer_kyc_profiles (kyc_status, updated_at desc);

create table if not exists public.customer_kyc_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  status text not null default 'created',
  challenge_nonce text not null,
  challenge_payload jsonb not null default '{}'::jsonb,
  provider text not null default '',
  provider_session_ref text,
  result_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_kyc_sessions
  add column if not exists purpose text not null default 'onboarding',
  add column if not exists status text not null default 'created',
  add column if not exists challenge_nonce text not null default '',
  add column if not exists challenge_payload jsonb not null default '{}'::jsonb,
  add column if not exists provider text not null default '',
  add column if not exists provider_session_ref text,
  add column if not exists result_payload jsonb not null default '{}'::jsonb,
  add column if not exists expires_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'customer_kyc_sessions_purpose_check'
      and conrelid = 'public.customer_kyc_sessions'::regclass
  ) then
    alter table public.customer_kyc_sessions drop constraint customer_kyc_sessions_purpose_check;
  end if;
end $$;

alter table public.customer_kyc_sessions
  add constraint customer_kyc_sessions_purpose_check
  check (purpose in ('onboarding', 'account_recovery', 'step_up'));

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'customer_kyc_sessions_status_check'
      and conrelid = 'public.customer_kyc_sessions'::regclass
  ) then
    alter table public.customer_kyc_sessions drop constraint customer_kyc_sessions_status_check;
  end if;
end $$;

alter table public.customer_kyc_sessions
  add constraint customer_kyc_sessions_status_check
  check (status in ('created', 'submitted', 'processing', 'passed', 'failed', 'expired', 'cancelled'));

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_customer_kyc_sessions_updated_at') then
    create trigger set_customer_kyc_sessions_updated_at
      before update on public.customer_kyc_sessions
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

create index if not exists customer_kyc_sessions_lookup_idx
  on public.customer_kyc_sessions (customer_id, purpose, status, expires_at desc);

create table if not exists public.customer_kyc_audit_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.customer_kyc_sessions(id) on delete set null,
  event_type text not null,
  event_status text not null default '',
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_kyc_audit_logs
  add column if not exists event_type text not null default 'unknown',
  add column if not exists event_status text not null default '',
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists customer_kyc_audit_logs_customer_idx
  on public.customer_kyc_audit_logs (customer_id, created_at desc);

alter table public.customer_kyc_profiles enable row level security;
alter table public.customer_kyc_sessions enable row level security;
alter table public.customer_kyc_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_kyc_profiles' and policyname='customer_kyc_profiles_self_select'
  ) then
    create policy customer_kyc_profiles_self_select
      on public.customer_kyc_profiles
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_kyc_sessions' and policyname='customer_kyc_sessions_self_select'
  ) then
    create policy customer_kyc_sessions_self_select
      on public.customer_kyc_sessions
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_kyc_audit_logs' and policyname='customer_kyc_audit_logs_self_select'
  ) then
    create policy customer_kyc_audit_logs_self_select
      on public.customer_kyc_audit_logs
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;
end $$;

grant select on public.customer_kyc_profiles to authenticated;
grant select on public.customer_kyc_sessions to authenticated;
grant select on public.customer_kyc_audit_logs to authenticated;

notify pgrst, 'reload schema';
