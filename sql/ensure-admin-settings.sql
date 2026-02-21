-- Admin settings table (one row per admin user)
create table if not exists public.admin_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Kittisap Admin',
  contact_email text not null default 'admin@kittisap.com',
  default_language text not null default 'th',
  store_name text not null default 'Kittisap Store',
  support_phone text not null default '+66 80-000-0000',
  currency text not null default 'THB',
  security_2fa_enabled boolean not null default true,
  session_policy text not null default '7d',
  notify_email_enabled boolean not null default true,
  notify_browser_enabled boolean not null default false,
  notify_order_enabled boolean not null default true,
  ui_mode text not null default 'auto',
  theme_preset text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure required columns exist even if the table was created earlier
alter table public.admin_settings
  add column if not exists display_name text not null default 'Kittisap Admin',
  add column if not exists contact_email text not null default 'admin@kittisap.com',
  add column if not exists default_language text not null default 'th',
  add column if not exists store_name text not null default 'Kittisap Store',
  add column if not exists support_phone text not null default '+66 80-000-0000',
  add column if not exists currency text not null default 'THB',
  add column if not exists security_2fa_enabled boolean not null default true,
  add column if not exists session_policy text not null default '7d',
  add column if not exists notify_email_enabled boolean not null default true,
  add column if not exists notify_browser_enabled boolean not null default false,
  add column if not exists notify_order_enabled boolean not null default true,
  add column if not exists ui_mode text not null default 'auto',
  add column if not exists theme_preset text not null default 'default',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_settings_default_language_check'
  ) then
    alter table public.admin_settings
      add constraint admin_settings_default_language_check
      check (default_language in ('th', 'en'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_settings_theme_preset_check'
  ) then
    alter table public.admin_settings
      add constraint admin_settings_theme_preset_check
      check (theme_preset in ('default', 'ocean', 'mint', 'sunset'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_settings_ui_mode_check'
  ) then
    alter table public.admin_settings
      add constraint admin_settings_ui_mode_check
      check (ui_mode in ('auto', 'windows', 'mobile'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_settings_session_policy_check'
  ) then
    alter table public.admin_settings
      add constraint admin_settings_session_policy_check
      check (session_policy in ('7d', '30d', 'never'));
  end if;
end $$;

-- Verification helpers (optional): run these after migration
-- select to_regclass('public.admin_settings') as table_exists;
-- select column_name from information_schema.columns where table_schema='public' and table_name='admin_settings' order by ordinal_position;
-- select policyname, cmd from pg_policies where schemaname='public' and tablename='admin_settings';

create or replace function public.set_admin_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_admin_settings_updated_at'
  ) then
    create trigger set_admin_settings_updated_at
      before update on public.admin_settings
      for each row
      execute function public.set_admin_settings_updated_at();
  end if;
end $$;

alter table public.admin_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_settings' and policyname = 'admin_settings_select_own'
  ) then
    create policy admin_settings_select_own
      on public.admin_settings
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_settings' and policyname = 'admin_settings_insert_own'
  ) then
    create policy admin_settings_insert_own
      on public.admin_settings
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_settings' and policyname = 'admin_settings_update_own'
  ) then
    create policy admin_settings_update_own
      on public.admin_settings
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
