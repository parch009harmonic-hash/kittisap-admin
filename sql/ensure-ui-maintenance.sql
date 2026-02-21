create extension if not exists pgcrypto;

create table if not exists public.ui_maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  enabled boolean not null default false,
  roles text[] not null default array['admin','staff'],
  platforms text[] not null default array['windows','android','ios'],
  message text not null default 'This page is temporarily under maintenance.',
  updated_by text null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_ui_maintenance_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ui_maintenance_rules_updated_at on public.ui_maintenance_rules;
create trigger trg_ui_maintenance_rules_updated_at
before update on public.ui_maintenance_rules
for each row
execute function public.touch_ui_maintenance_rules_updated_at();

insert into public.ui_maintenance_rules (path, enabled, roles, platforms, message)
values
  ('/admin', false, array['admin','staff'], array['windows','android','ios'], 'This page is temporarily under maintenance.'),
  ('/admin/products', false, array['admin','staff'], array['windows','android','ios'], 'This page is temporarily under maintenance.'),
  ('/admin/orders', false, array['admin','staff'], array['windows','android','ios'], 'This page is temporarily under maintenance.'),
  ('/admin/coupons', false, array['admin','staff'], array['windows','android','ios'], 'This page is temporarily under maintenance.'),
  ('/admin/settings', false, array['admin','staff'], array['windows','android','ios'], 'This page is temporarily under maintenance.')
on conflict (path) do nothing;
