-- Ensure required product columns exist
alter table public.products
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists price numeric not null default 0,
  add column if not exists stock integer not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists is_featured boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_status_check'
  ) then
    alter table public.products
      add constraint products_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

create or replace function public.set_products_updated_at()
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
    select 1
    from pg_trigger
    where tgname = 'set_products_updated_at'
  ) then
    create trigger set_products_updated_at
      before update on public.products
      for each row
      execute function public.set_products_updated_at();
  end if;
end $$;

-- Performance indexes for faster admin list/search queries
create index if not exists products_created_at_idx
  on public.products (created_at desc);

create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);

create index if not exists products_is_featured_status_created_at_idx
  on public.products (is_featured, status, created_at desc);

create index if not exists products_sku_lower_idx
  on public.products (lower(sku));

create index if not exists products_slug_lower_idx
  on public.products (lower(slug));

create index if not exists product_images_product_id_is_primary_idx
  on public.product_images (product_id, is_primary);

-- Ensure storage bucket exists
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
