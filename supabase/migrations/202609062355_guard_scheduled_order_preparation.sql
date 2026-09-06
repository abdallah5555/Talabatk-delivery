create or replace function public.merchant_update_order(p_order_id uuid, p_status public.order_status, p_estimated_minutes integer default null)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare v public.orders%rowtype;
begin
 if auth.uid() is null or not public.has_role('merchant') then raise exception 'Merchant authorization required'; end if;
 update public.orders o
 set status=p_status,estimated_minutes=coalesce(p_estimated_minutes,o.estimated_minutes),updated_at=now()
 where o.id=p_order_id
   and exists(select 1 from public.stores s where s.id=o.store_id and s.owner_id=auth.uid())
   and (
     (o.status='pending' and p_status in ('accepted','rejected'))
     or (o.status='accepted' and p_status='preparing' and (o.scheduled_for is null or o.scheduled_for <= now()+interval '90 minutes'))
     or (o.status='preparing' and p_status='ready')
   )
 returning o.* into v;
 if not found then raise exception 'Invalid merchant transition, permission, or scheduled preparation is too early'; end if;
 return v;
end;
$$;
revoke all on function public.merchant_update_order(uuid,public.order_status,integer) from public,anon;
grant execute on function public.merchant_update_order(uuid,public.order_status,integer) to authenticated,service_role;
