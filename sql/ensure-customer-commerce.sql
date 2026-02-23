-- Customer commerce foundation
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  line_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_settings (
  id text primary key default 'default',
  promptpay_phone text not null,
  promptpay_base_url text not null default 'https://promptpay.io',
  allow_custom_amount boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id, promptpay_phone, promptpay_base_url, allow_custom_amount)
values ('default', '0843374982', 'https://promptpay.io', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid not null references public.customer_profiles(id) on delete restrict,
  status text not null default 'pending_payment',
  payment_status text not null default 'unpaid',
  payment_method text not null default 'promptpay_transfer',
  sub_total numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  coupon_id uuid,
  coupon_code_snapshot text,
  promptpay_phone_snapshot text not null,
  promptpay_link_snapshot text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled')),
  constraint orders_payment_status_check check (payment_status in ('unpaid', 'pending_verify', 'paid', 'failed', 'expired'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  sku_snapshot text not null,
  name_snapshot text not null,
  unit_price_snapshot numeric(12,2) not null,
  qty int not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_qty_check check (qty > 0)
);

create index if not exists orders_customer_created_at_idx
  on public.orders (customer_id, created_at desc);

create index if not exists orders_status_created_at_idx
  on public.orders (status, payment_status, created_at desc);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_customer_profiles_updated_at') then
    create trigger set_customer_profiles_updated_at
      before update on public.customer_profiles
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_payment_settings_updated_at') then
    create trigger set_payment_settings_updated_at
      before update on public.payment_settings
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_orders_updated_at') then
    create trigger set_orders_updated_at
      before update on public.orders
      for each row
      execute function public.set_timestamp_updated_at();
  end if;
end $$;

alter table public.orders
  add column if not exists customer_name_snapshot text,
  add column if not exists customer_phone_snapshot text,
  add column if not exists customer_email_snapshot text;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'orders_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_status_check;
  end if;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending_payment', 'pending_review', 'paid', 'processing', 'shipped', 'completed', 'cancelled'));

create table if not exists public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_no text not null,
  customer_id uuid not null references public.customer_profiles(id) on delete restrict,
  file_path text not null,
  file_url text,
  status text not null default 'pending_review',
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  note text
);

create index if not exists payment_slips_order_id_idx
  on public.payment_slips (order_id, uploaded_at desc);

create index if not exists payment_slips_customer_id_idx
  on public.payment_slips (customer_id, uploaded_at desc);

alter table public.payment_slips enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payment_slips' and policyname='payment_slips_self_select'
  ) then
    create policy payment_slips_self_select
      on public.payment_slips
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payment_slips' and policyname='payment_slips_self_insert'
  ) then
    create policy payment_slips_self_insert
      on public.payment_slips
      for insert
      to authenticated
      with check (customer_id = auth.uid());
  end if;
end $$;

create or replace function public.reserve_product_stock(p_product_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected int := 0;
begin
  if p_qty <= 0 then
    return false;
  end if;

  update public.products
  set stock = stock - p_qty
  where id = p_product_id
    and status = 'active'
    and stock >= p_qty;

  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.release_product_stock(p_product_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_qty <= 0 then
    return false;
  end if;

  update public.products
  set stock = stock + p_qty
  where id = p_product_id;

  return true;
end;
$$;

alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_profiles' and policyname='customer_profiles_self_select'
  ) then
    create policy customer_profiles_self_select
      on public.customer_profiles
      for select
      to authenticated
      using (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_profiles' and policyname='customer_profiles_self_upsert'
  ) then
    create policy customer_profiles_self_upsert
      on public.customer_profiles
      for all
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payment_settings' and policyname='payment_settings_authenticated_select'
  ) then
    create policy payment_settings_authenticated_select
      on public.payment_settings
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='orders' and policyname='orders_self_select'
  ) then
    create policy orders_self_select
      on public.orders
      for select
      to authenticated
      using (customer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='orders' and policyname='orders_self_insert'
  ) then
    create policy orders_self_insert
      on public.orders
      for insert
      to authenticated
      with check (customer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='orders' and policyname='orders_self_update_payment_submit'
  ) then
    create policy orders_self_update_payment_submit
      on public.orders
      for update
      to authenticated
      using (
        customer_id = auth.uid()
        and status = 'pending_payment'
        and payment_status = 'unpaid'
      )
      with check (
        customer_id = auth.uid()
        and status in ('pending_payment', 'pending_review')
        and payment_status in ('unpaid', 'pending_verify')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='order_items' and policyname='order_items_self_select'
  ) then
    create policy order_items_self_select
      on public.order_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          where o.id = order_items.order_id
            and o.customer_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='order_items' and policyname='order_items_self_insert'
  ) then
    create policy order_items_self_insert
      on public.order_items
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.orders o
          where o.id = order_items.order_id
            and o.customer_id = auth.uid()
        )
      );
  end if;
end $$;

grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant select, insert on public.payment_slips to authenticated;
grant select on public.payment_settings to authenticated;
grant execute on function public.reserve_product_stock(uuid, int) to authenticated;
grant execute on function public.release_product_stock(uuid, int) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='payment_slips_object_insert_self'
  ) then
    create policy payment_slips_object_insert_self
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'payment-slips'
        and owner = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='payment_slips_object_select_self'
  ) then
    create policy payment_slips_object_select_self
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'payment-slips'
        and owner = auth.uid()
      );
  end if;
end $$;
