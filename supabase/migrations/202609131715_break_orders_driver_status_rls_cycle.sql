-- Break the circular RLS dependency orders -> driver_status -> orders.
-- Helpers are scoped to auth.uid() and run as definer only to bypass the
-- intermediate table policy, never to widen access beyond the caller.

create or replace function public.current_driver_is_online()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.driver_status ds
    where ds.user_id = auth.uid()
      and ds.is_online = true
  );
$$;

revoke all on function public.current_driver_is_online() from public;
revoke all on function public.current_driver_is_online() from anon;
grant execute on function public.current_driver_is_online() to authenticated;

drop policy if exists orders_read on public.orders;
create policy orders_read
on public.orders
for select
to authenticated
using (
  customer_id = auth.uid()
  or driver_id = auth.uid()
  or public.has_role('admin'::public.app_role)
  or exists (
    select 1
    from public.stores s
    where s.id = orders.store_id
      and s.owner_id = auth.uid()
  )
  or (
    status = 'ready'::public.order_status
    and driver_id is null
    and public.has_role('driver'::public.app_role)
    and public.current_driver_is_online()
  )
);

create or replace function public.customer_can_read_driver_status(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.orders o
    where o.customer_id = auth.uid()
      and o.driver_id = p_driver_id
      and o.status in (
        'assigned'::public.order_status,
        'picked_up'::public.order_status,
        'on_the_way'::public.order_status
      )
  );
$$;

revoke all on function public.customer_can_read_driver_status(uuid) from public;
revoke all on function public.customer_can_read_driver_status(uuid) from anon;
grant execute on function public.customer_can_read_driver_status(uuid) to authenticated;

drop policy if exists driver_status_customer_active_order_read on public.driver_status;
create policy driver_status_customer_active_order_read
on public.driver_status
for select
to authenticated
using (public.customer_can_read_driver_status(user_id));
