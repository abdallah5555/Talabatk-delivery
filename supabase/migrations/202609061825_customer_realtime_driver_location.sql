revoke all on function public.log_order_status_history() from public, anon, authenticated;

drop policy if exists driver_status_customer_active_order_read on public.driver_status;
create policy driver_status_customer_active_order_read
on public.driver_status for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.customer_id = (select auth.uid())
      and o.driver_id = driver_status.user_id
      and o.status in ('assigned','picked_up','on_the_way')
  )
);

create or replace function public.get_order_driver_location(p_order_id uuid)
returns table(latitude double precision, longitude double precision, updated_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select ds.latitude, ds.longitude, ds.updated_at
  from public.orders o
  join public.driver_status ds on ds.user_id=o.driver_id
  where o.id=p_order_id
    and o.customer_id=auth.uid()
    and o.driver_id is not null
    and o.status in ('assigned','picked_up','on_the_way');
$$;
revoke all on function public.get_order_driver_location(uuid) from public, anon;
grant execute on function public.get_order_driver_location(uuid) to authenticated;
