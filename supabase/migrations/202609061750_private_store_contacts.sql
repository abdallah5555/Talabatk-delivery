-- Applied to project vriwhtuxagnbfxybjviz on 2026-09-06.
create table if not exists public.store_private_contacts (
  store_id uuid primary key references public.stores(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.store_private_contacts enable row level security;

insert into public.store_private_contacts(store_id, phone)
select id, phone from public.stores where nullif(btrim(phone),'') is not null
on conflict (store_id) do update set phone=excluded.phone, updated_at=now();

update public.stores set phone=null where phone is not null;

revoke all on public.store_private_contacts from anon, authenticated;
grant select, insert, update, delete on public.store_private_contacts to service_role;

drop policy if exists store_private_contacts_owner_read on public.store_private_contacts;
create policy store_private_contacts_owner_read on public.store_private_contacts
for select to authenticated
using (
  exists(select 1 from public.stores s where s.id=store_id and s.owner_id=(select auth.uid()))
  or public.has_role('admin')
  or exists(
    select 1 from public.orders o
    where o.store_id=store_id
      and o.status not in ('pending','rejected','cancelled')
      and (o.customer_id=(select auth.uid()) or o.driver_id=(select auth.uid()))
  )
);

grant select on public.store_private_contacts to authenticated;
