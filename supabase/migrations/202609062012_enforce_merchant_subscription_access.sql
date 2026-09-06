create or replace function public.merchant_access_allowed(p_store_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_service_access a cross join public.platform_commercial_settings c where a.store_id=p_store_id and c.id='global' and a.merchant_service_enabled=true and (c.merchant_subscription_required=false or a.merchant_monthly_price=0 or a.merchant_subscription_expires_at>now()));
$$;
create or replace function public.cashier_access_allowed(p_store_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_service_access a cross join public.platform_commercial_settings c where a.store_id=p_store_id and c.id='global' and a.cashier_enabled=true and public.merchant_access_allowed(p_store_id) and (c.cashier_subscription_required=false or a.cashier_monthly_price=0 or a.cashier_subscription_expires_at>now()));
$$;

create or replace function public.merchant_update_order(p_order_id uuid,p_status public.order_status,p_estimated_minutes integer default null) returns public.orders language plpgsql security definer set search_path='' as $$
declare v public.orders%rowtype; v_store uuid; begin
 if auth.uid() is null or not public.has_role('merchant') then raise exception 'Merchant authorization required'; end if;
 select o.store_id into v_store from public.orders o join public.stores s on s.id=o.store_id where o.id=p_order_id and s.owner_id=auth.uid();
 if v_store is null or not public.merchant_access_allowed(v_store) then raise exception 'Merchant service is disabled or subscription expired'; end if;
 update public.orders o set status=p_status,estimated_minutes=coalesce(p_estimated_minutes,o.estimated_minutes),updated_at=now() where o.id=p_order_id and o.store_id=v_store and ((o.status='pending' and p_status in ('accepted','rejected')) or (o.status='accepted' and p_status='preparing' and (o.scheduled_for is null or o.scheduled_for<=now()+interval '90 minutes')) or (o.status='preparing' and p_status='ready')) returning o.* into v;
 if not found then raise exception 'Invalid merchant transition, schedule window, or permission'; end if; return v; end $$;

drop policy if exists menu_owner_insert on public.menu_items; drop policy if exists menu_owner_update on public.menu_items; drop policy if exists menu_owner_delete on public.menu_items;
create policy menu_owner_insert on public.menu_items for insert to authenticated with check (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=menu_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(menu_items.store_id)));
create policy menu_owner_update on public.menu_items for update to authenticated using (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=menu_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(menu_items.store_id))) with check (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=menu_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(menu_items.store_id)));
create policy menu_owner_delete on public.menu_items for delete to authenticated using (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=menu_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(menu_items.store_id)));

drop policy if exists inventory_items_owner_all on public.inventory_items;
create policy inventory_items_owner_all on public.inventory_items for all to authenticated using (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=inventory_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(inventory_items.store_id))) with check (public.has_role('admin') or (public.has_role('merchant') and exists(select 1 from public.stores s where s.id=inventory_items.store_id and s.owner_id=auth.uid()) and public.merchant_access_allowed(inventory_items.store_id)));

drop policy if exists inventory_movements_owner_insert on public.inventory_movements;
create policy inventory_movements_owner_insert on public.inventory_movements for insert to authenticated with check (public.has_role('admin') or exists(select 1 from public.inventory_items i join public.stores s on s.id=i.store_id where i.id=inventory_movements.item_id and s.owner_id=auth.uid() and public.has_role('merchant') and public.merchant_access_allowed(s.id)));
