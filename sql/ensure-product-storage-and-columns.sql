-- Ensure required product columns exist
alter table public.products
  add column if not exists price numeric not null default 0,
  add column if not exists stock integer not null default 0,
  add column if not exists status text not null default 'active';

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

-- Ensure storage bucket exists
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
