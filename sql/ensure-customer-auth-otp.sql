-- Customer auth OTP audit schema bootstrap
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.customer_auth_otp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  purpose text not null,
  customer_id uuid references auth.users(id) on delete set null,
  email_hash text not null,
  email_masked text not null,
  ip_address text,
  user_agent text,
  event_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint customer_auth_otp_audit_logs_purpose_check
    check (purpose in ('forgot_password', 'account_recovery')),
  constraint customer_auth_otp_audit_logs_event_status_check
    check (
      event_status in (
        'accepted_sent',
        'accepted_not_found',
        'rate_limited_ip',
        'rate_limited_email',
        'rate_limited_ip_email',
        'provider_rate_limited',
        'invalid_email',
        'provider_error'
      )
    )
);

create index if not exists customer_auth_otp_audit_logs_created_idx
  on public.customer_auth_otp_audit_logs (created_at desc);

create index if not exists customer_auth_otp_audit_logs_purpose_created_idx
  on public.customer_auth_otp_audit_logs (purpose, created_at desc);

create index if not exists customer_auth_otp_audit_logs_email_hash_idx
  on public.customer_auth_otp_audit_logs (email_hash, created_at desc);

notify pgrst, 'reload schema';
