alter table public.orders add column if not exists scheduled_for timestamptz;

create or replace function public.create_order_scheduled(
  p_store_id uuid,
  p_items jsonb,
  p_address text,
  p_request_id uuid,
  p_payment_method text default 'cash',
  p_note text default '',
  p_scheduled_for timestamptz default null
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare v_order public.orders%rowtype;
begin
  if p_scheduled_for is not null then
    if p_scheduled_for < now() + interval '15 minutes' then raise exception 'Scheduled time must be at least 15 minutes from now'; end if;
    if p_scheduled_for > now() + interval '7 days' then raise exception 'Scheduled time cannot exceed 7 days'; end if;
  end if;
  v_order := public.create_order_idempotent(p_store_id,p_items,p_address,p_request_id,p_payment_method,p_note);
  if p_scheduled_for is not null and v_order.scheduled_for is null then
    update public.orders set scheduled_for=p_scheduled_for,updated_at=now()
    where id=v_order.id and customer_id=auth.uid() and client_request_id=p_request_id
    returning * into v_order;
  end if;
  return v_order;
end;
$$;
revoke all on function public.create_order_scheduled(uuid,jsonb,text,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.create_order_scheduled(uuid,jsonb,text,uuid,text,text,timestamptz) to authenticated,service_role;
create index if not exists orders_scheduled_for_idx on public.orders(scheduled_for) where scheduled_for is not null;
