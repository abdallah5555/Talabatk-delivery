create or replace function public.submit_store_review(p_order_id uuid, p_rating integer, p_comment text)
returns public.store_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders%rowtype;
  v_review public.store_reviews%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Invalid rating'; end if;

  select * into v_order from public.orders
   where id=p_order_id and customer_id=v_user and status='delivered'::public.order_status;
  if not found then raise exception 'Only delivered own orders can be reviewed'; end if;
  if exists(select 1 from public.store_reviews where order_id=p_order_id) then raise exception 'Order already reviewed'; end if;

  insert into public.store_reviews(store_id,customer_id,order_id,rating,comment)
  values(v_order.store_id,v_user,p_order_id,p_rating,left(coalesce(trim(p_comment),''),1000))
  returning * into v_review;

  update public.stores s
     set rating = coalesce((select round(avg(r.rating)::numeric,2) from public.store_reviews r where r.store_id=s.id),5)
   where s.id=v_order.store_id;

  return v_review;
end;
$$;
revoke all on function public.submit_store_review(uuid,integer,text) from public, anon;
grant execute on function public.submit_store_review(uuid,integer,text) to authenticated;

create or replace function public.adjust_inventory(p_item_id uuid, p_delta numeric, p_reason text default 'manual')
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_item public.inventory_items%rowtype;
  v_new numeric;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_delta = 0 then raise exception 'Delta cannot be zero'; end if;

  select i.* into v_item
  from public.inventory_items i
  join public.stores s on s.id=i.store_id
  where i.id=p_item_id
    and ((s.owner_id=v_user and public.has_role('merchant'::public.app_role)) or public.has_role('admin'::public.app_role))
  for update of i;

  if not found then raise exception 'Inventory item not found or unauthorized'; end if;
  v_new := v_item.quantity + p_delta;
  if v_new < 0 then raise exception 'Insufficient inventory'; end if;

  update public.inventory_items set quantity=v_new, updated_at=now() where id=v_item.id;
  insert into public.inventory_movements(item_id,actor_id,delta,balance_after,reason)
  values(v_item.id,v_user,p_delta,v_new,left(coalesce(nullif(trim(p_reason),''),'manual'),200));
  return v_new;
end;
$$;
revoke all on function public.adjust_inventory(uuid,numeric,text) from public, anon;
grant execute on function public.adjust_inventory(uuid,numeric,text) to authenticated;
