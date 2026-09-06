create or replace function public.driver_accept_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.orders%rowtype;
  v_count integer;
  v_online boolean;
begin
  if auth.uid() is null or not public.is_driver() then
    raise exception 'Driver authorization required';
  end if;

  select d.is_online into v_online
  from public.driver_status d
  where d.user_id = auth.uid()
  for update;

  if not found or not coalesce(v_online,false) then
    raise exception 'السائق لازم يكون أونلاين';
  end if;

  select count(*) into v_count
  from public.orders
  where driver_id = auth.uid()
    and status in ('assigned','picked_up','on_the_way');

  if v_count >= 3 then
    raise exception 'وصلت للحد الأقصى: 3 طلبات نشطة';
  end if;

  update public.orders o
  set driver_id = auth.uid(), status = 'assigned', updated_at = now()
  where o.id = p_order_id
    and o.status = 'ready'
    and o.driver_id is null
  returning o.* into v;

  if not found then
    raise exception 'Order no longer available';
  end if;

  return v;
end;
$$;

revoke all on function public.driver_accept_order(uuid) from public, anon;
grant execute on function public.driver_accept_order(uuid) to authenticated, service_role;

create or replace function public.auto_assign_nearest_driver(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver uuid;
  v_lat double precision;
  v_lng double precision;
begin
  if auth.uid() is null or (not public.has_role('merchant') and not public.has_role('admin')) then
    raise exception 'Dispatch authorization required';
  end if;

  select s.latitude, s.longitude
  into v_lat, v_lng
  from public.orders o
  join public.stores s on s.id = o.store_id
  where o.id = p_order_id
    and o.status = 'ready'
    and o.driver_id is null
    and (public.has_role('admin') or s.owner_id = auth.uid())
  for update of o;

  if not found then
    raise exception 'Order is not dispatchable or not allowed';
  end if;

  if v_lat is null or v_lng is null then
    return null;
  end if;

  select d.user_id
  into v_driver
  from public.driver_status d
  join public.user_roles ur
    on ur.user_id = d.user_id and ur.role = 'driver'
  join public.profiles p
    on p.id = d.user_id and p.is_active = true
  cross join lateral (
    select count(*)::integer as active_count
    from public.orders x
    where x.driver_id = d.user_id
      and x.status in ('assigned','picked_up','on_the_way')
  ) load
  where d.is_online = true
    and d.latitude is not null
    and d.longitude is not null
    and d.updated_at >= now() - interval '5 minutes'
    and load.active_count < 3
  order by load.active_count asc,
           abs(d.latitude - v_lat) + abs(d.longitude - v_lng) asc
  for update of d skip locked
  limit 1;

  if v_driver is null then
    return null;
  end if;

  update public.orders
  set driver_id = v_driver,
      status = 'assigned',
      updated_at = now()
  where id = p_order_id
    and status = 'ready'
    and driver_id is null;

  if found then
    return v_driver;
  end if;

  return null;
end;
$$;

revoke all on function public.auto_assign_nearest_driver(uuid) from public, anon;
grant execute on function public.auto_assign_nearest_driver(uuid) to authenticated, service_role;
