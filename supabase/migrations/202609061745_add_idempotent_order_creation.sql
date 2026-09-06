-- Applied to project vriwhtuxagnbfxybjviz on 2026-09-06.
alter table public.orders add column if not exists client_request_id uuid;
create unique index if not exists orders_customer_client_request_uidx
  on public.orders(customer_id, client_request_id)
  where client_request_id is not null;

update public.stores set min_order = 0 where coalesce(min_order,0) <> 0;
revoke execute on function public.validate_coupon(text,numeric) from public, anon, authenticated;

create or replace function public.create_order_idempotent(
  p_store_id uuid,
  p_items jsonb,
  p_address text,
  p_request_id uuid,
  p_payment_method text default 'cash',
  p_note text default ''
) returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_subtotal numeric(12,2);
  v_fee numeric(12,2);
  v_total numeric(12,2);
  v_eta integer;
  v_order public.orders%rowtype;
  v_count integer;
begin
  if v_uid is null or not public.has_role('customer') then raise exception 'Customer authentication required'; end if;
  if not exists(select 1 from public.profiles where id=v_uid and is_active=true) then raise exception 'Account is inactive'; end if;
  if p_request_id is null then raise exception 'Request id is required'; end if;
  select * into v_order from public.orders where customer_id=v_uid and client_request_id=p_request_id;
  if found then return v_order; end if;
  if btrim(coalesce(p_address,''))='' then raise exception 'Delivery address is required'; end if;
  if p_payment_method not in ('cash','merchant_paid_online') then raise exception 'Unsupported payment method'; end if;
  select delivery_fee, prep_minutes into v_fee, v_eta from public.stores where id=p_store_id and is_open=true;
  if not found then raise exception 'Store is unavailable'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Order items required'; end if;
  select count(*) into v_count from jsonb_to_recordset(p_items) x(menu_item_id uuid, quantity integer);
  if exists(select 1 from jsonb_to_recordset(p_items) x(menu_item_id uuid, quantity integer) where x.quantity is null or x.quantity<1 or x.quantity>30) then raise exception 'Invalid quantity'; end if;
  if v_count<>(select count(distinct (x->>'menu_item_id')) from jsonb_array_elements(p_items) x) then raise exception 'Duplicate order item'; end if;
  if v_count<>(select count(*) from public.menu_items m where m.id in(select (x->>'menu_item_id')::uuid from jsonb_array_elements(p_items) x) and m.store_id=p_store_id and m.is_available=true) then raise exception 'One or more items are unavailable'; end if;
  select coalesce(sum(m.price*r.quantity),0) into v_subtotal
  from jsonb_to_recordset(p_items) r(menu_item_id uuid, quantity integer)
  join public.menu_items m on m.id=r.menu_item_id and m.store_id=p_store_id and m.is_available=true;
  v_total := v_subtotal + coalesce(v_fee,0);
  begin
    insert into public.orders(customer_id,store_id,status,subtotal,delivery_fee,total,payment_method,delivery_address,customer_note,estimated_minutes,client_request_id)
    values(v_uid,p_store_id,'pending',v_subtotal,coalesce(v_fee,0),v_total,p_payment_method,trim(p_address),coalesce(trim(p_note),''),coalesce(v_eta,20)+20,p_request_id)
    returning * into v_order;
  exception when unique_violation then
    select * into v_order from public.orders where customer_id=v_uid and client_request_id=p_request_id;
    return v_order;
  end;
  insert into public.order_items(order_id,menu_item_id,name_snapshot,unit_price,quantity)
  select v_order.id,m.id,m.name,m.price,r.quantity
  from jsonb_to_recordset(p_items) r(menu_item_id uuid,quantity integer)
  join public.menu_items m on m.id=r.menu_item_id and m.store_id=p_store_id and m.is_available=true;
  return v_order;
end;
$$;

revoke all on function public.create_order_idempotent(uuid,jsonb,text,uuid,text,text) from public, anon;
grant execute on function public.create_order_idempotent(uuid,jsonb,text,uuid,text,text) to authenticated, service_role;
