drop policy if exists menu_owner_insert on public.menu_items;
create policy menu_owner_insert on public.menu_items
for insert to authenticated
with check (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = menu_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
);

drop policy if exists menu_owner_update on public.menu_items;
create policy menu_owner_update on public.menu_items
for update to authenticated
using (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = menu_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
)
with check (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = menu_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
);

drop policy if exists menu_owner_delete on public.menu_items;
create policy menu_owner_delete on public.menu_items
for delete to authenticated
using (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = menu_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
);

drop policy if exists inventory_items_owner_all on public.inventory_items;
create policy inventory_items_owner_all on public.inventory_items
for all to authenticated
using (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = inventory_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
)
with check (
  (select public.has_role('admin'::public.app_role))
  or (
    (select public.has_role('merchant'::public.app_role))
    and exists (
      select 1 from public.stores s
      where s.id = inventory_items.store_id
        and s.owner_id = (select auth.uid())
    )
    and public.merchant_access_allowed(store_id)
  )
);

drop policy if exists inventory_movements_owner_insert on public.inventory_movements;
create policy inventory_movements_owner_insert on public.inventory_movements
for insert to authenticated
with check (
  (select public.has_role('admin'::public.app_role))
  or exists (
    select 1
    from public.inventory_items i
    join public.stores s on s.id = i.store_id
    where i.id = inventory_movements.item_id
      and s.owner_id = (select auth.uid())
      and (select public.has_role('merchant'::public.app_role))
      and public.merchant_access_allowed(s.id)
  )
);

drop policy if exists store_service_access_owner_read on public.store_service_access;
create policy store_service_access_owner_read on public.store_service_access
for select to authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_service_access.store_id
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists driver_earnings_self_read on public.driver_earnings;
create policy driver_earnings_self_read on public.driver_earnings
for select to authenticated
using (
  driver_id = (select auth.uid())
  or (select public.has_role('admin'::public.app_role))
);
