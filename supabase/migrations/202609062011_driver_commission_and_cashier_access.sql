create table if not exists public.driver_earnings (
  order_id uuid primary key references public.orders(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  gross_delivery_fee numeric(12,2) not null check (gross_delivery_fee >= 0),
  platform_commission_percent numeric(5,2) not null check (platform_commission_percent between 0 and 100),
  platform_commission_amount numeric(12,2) not null check (platform_commission_amount >= 0),
  driver_net_amount numeric(12,2) not null check (driver_net_amount >= 0),
  earned_at timestamptz not null default now()
);
alter table public.driver_earnings enable row level security;
revoke all on public.driver_earnings from anon, authenticated;
grant select on public.driver_earnings to authenticated;
create policy driver_earnings_self_read on public.driver_earnings for select to authenticated using (driver_id=auth.uid() or public.has_role('admin'));
insert into public.driver_earnings(order_id,driver_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at)
select o.id,o.driver_id,coalesce(o.delivery_fee,0),0,0,coalesce(o.delivery_fee,0),coalesce(o.updated_at,o.created_at,now()) from public.orders o where o.status='delivered' and o.driver_id is not null on conflict(order_id) do nothing;

create or replace function public.merchant_access_allowed(p_store_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_service_access a cross join public.platform_commercial_settings c where a.store_id=p_store_id and c.id='global' and a.merchant_service_enabled=true and (c.merchant_subscription_required=false or a.merchant_monthly_price=0 or a.merchant_subscription_expires_at>now()));
$$;
create or replace function public.cashier_access_allowed(p_store_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_service_access a cross join public.platform_commercial_settings c where a.store_id=p_store_id and c.id='global' and a.cashier_enabled=true and public.merchant_access_allowed(p_store_id) and (c.cashier_subscription_required=false or a.cashier_monthly_price=0 or a.cashier_subscription_expires_at>now()));
$$;
revoke all on function public.merchant_access_allowed(uuid), public.cashier_access_allowed(uuid) from public, anon;
grant execute on function public.merchant_access_allowed(uuid), public.cashier_access_allowed(uuid) to authenticated;

create or replace function public.driver_update_order(p_order_id uuid,p_status public.order_status) returns public.orders language plpgsql security definer set search_path='' as $$
declare v public.orders%rowtype; v_pct numeric; v_fee numeric; v_commission numeric; v_net numeric; begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id and driver_id=auth.uid() and ((status='assigned' and p_status='picked_up') or (status='picked_up' and p_status='on_the_way') or (status='on_the_way' and p_status='delivered')) returning * into v;
 if not found then raise exception 'Invalid driver transition or permission'; end if;
 if p_status='delivered' then select driver_platform_commission_percent into v_pct from public.platform_commercial_settings where id='global'; v_pct:=coalesce(v_pct,0); v_fee:=coalesce(v.delivery_fee,0); v_commission:=round(v_fee*v_pct/100,2); v_net:=greatest(0,v_fee-v_commission); insert into public.driver_earnings(order_id,driver_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at) values(v.id,auth.uid(),v_fee,v_pct,v_commission,v_net,now()) on conflict(order_id) do nothing; end if;
 return v; end $$;
revoke execute on function public.driver_update_order(uuid,public.order_status) from anon, public; grant execute on function public.driver_update_order(uuid,public.order_status) to authenticated;

create or replace function public.create_pos_sale(p_store_id uuid,p_items jsonb,p_note text default '') returns public.pos_sales language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_total numeric; v_sale public.pos_sales%rowtype; begin
 if v_user is null or not public.has_role('merchant'::public.app_role) then raise exception 'Merchant authorization required'; end if;
 if not exists(select 1 from public.stores where id=p_store_id and owner_id=v_user) then raise exception 'Store unauthorized'; end if;
 if not public.cashier_access_allowed(p_store_id) then raise exception 'Cashier service is disabled for this store'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Items required'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) x(menu_item_id uuid,quantity integer) where quantity is null or quantity<1 or quantity>100) then raise exception 'Invalid quantity'; end if;
 select sum(m.price*x.quantity) into v_total from jsonb_to_recordset(p_items) x(menu_item_id uuid,quantity integer) join public.menu_items m on m.id=x.menu_item_id and m.store_id=p_store_id and m.is_available=true;
 if v_total is null then raise exception 'Invalid items'; end if;
 insert into public.pos_sales(store_id,actor_id,total,note) values(p_store_id,v_user,v_total,left(coalesce(trim(p_note),''),500)) returning * into v_sale;
 insert into public.pos_sale_items(sale_id,menu_item_id,name_snapshot,unit_price,quantity) select v_sale.id,m.id,m.name,m.price,x.quantity from jsonb_to_recordset(p_items) x(menu_item_id uuid,quantity integer) join public.menu_items m on m.id=x.menu_item_id and m.store_id=p_store_id;
 return v_sale; end $$;
