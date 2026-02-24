-- Kittisap Public Site + Admin Shared Schema
-- Target: Supabase Postgres

create extension if not exists pgcrypto;

-- =============================
-- 1) Core master tables
-- =============================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_th text not null,
  name_en text,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  title_th text not null,
  title_en text,
  description_th text,
  description_en text,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_status_created_at on public.products (status, created_at desc);
create index if not exists idx_products_category_id on public.products (category_id);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  is_primary boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id_sort on public.product_images (product_id, sort asc);
create index if not exists idx_product_images_primary on public.product_images (product_id, is_primary);

-- =============================
-- 2) Identity split
-- =============================

-- Admin/staff profiles (admin guard checks only this table)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customer profiles (separated from admin role)
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  line_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================
-- 3) Commerce tables
-- =============================

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0),
  min_spend numeric(12,2) not null default 0 check (min_spend >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  usage_limit int,
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupons_code_active on public.coupons (code, is_active);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid not null references auth.users(id),
  full_name text not null,
  phone text not null,
  note text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  final_amount numeric(12,2) not null check (final_amount >= 0),
  coupon_code text,
  status text not null default 'awaiting_payment' check (status in (
    'awaiting_payment', 'pending_review', 'paid', 'rejected', 'cancelled', 'fulfilled'
  )),
  promptpay_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_id_created_at on public.orders (customer_id, created_at desc);
create index if not exists idx_orders_status_created_at on public.orders (status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title_snapshot text not null,
  sku_snapshot text not null,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  qty int not null check (qty > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

create table if not exists public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  file_path text not null,
  file_url text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_payment_slips_order_id_uploaded_at on public.payment_slips (order_id, uploaded_at desc);

-- =============================
-- 4) Config table (PromptPay settings)
-- =============================

create table if not exists public.settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value_json)
values ('payment_promptpay', '{"base_url":"https://promptpay.io/","phone":"0843374982"}'::jsonb)
on conflict (key) do nothing;

-- =============================
-- 5) Helpers
-- =============================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customer_profiles_updated_at on public.customer_profiles;
create trigger trg_customer_profiles_updated_at before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at before update on public.coupons
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at before update on public.settings
for each row execute function public.set_updated_at();

-- Optional: atomic stock deduction function
create or replace function public.reserve_product_stock(p_product_id uuid, p_qty int)
returns boolean
language plpgsql
security definer
as $$
declare
  v_stock int;
begin
  if p_qty <= 0 then
    return false;
  end if;

  select stock into v_stock
  from public.products
  where id = p_product_id
  for update;

  if v_stock is null or v_stock < p_qty then
    return false;
  end if;

  update public.products
  set stock = stock - p_qty
  where id = p_product_id;

  return true;
end;
$$;

-- =============================
-- 6) RLS
-- =============================

alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_slips enable row level security;

-- Customer profile: owner only
drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own
on public.customer_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists customer_profiles_update_own on public.customer_profiles;
create policy customer_profiles_update_own
on public.customer_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists customer_profiles_insert_own on public.customer_profiles;
create policy customer_profiles_insert_own
on public.customer_profiles
for insert
to authenticated
with check (id = auth.uid());

-- Orders: customer can view only own rows
drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
on public.orders
for select
to authenticated
using (customer_id = auth.uid());

-- Optional direct customer insert policy (if API uses user token)
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own
on public.orders
for insert
to authenticated
with check (customer_id = auth.uid());

-- Order items view restricted by parent order ownership
drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
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

-- Payment slips view/insert restricted by parent order ownership
drop policy if exists payment_slips_select_own on public.payment_slips;
create policy payment_slips_select_own
on public.payment_slips
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = payment_slips.order_id
      and o.customer_id = auth.uid()
  )
);

drop policy if exists payment_slips_insert_own on public.payment_slips;
create policy payment_slips_insert_own
on public.payment_slips
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = payment_slips.order_id
      and o.customer_id = auth.uid()
  )
);
