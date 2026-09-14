-- Upfront delivery pricing: transparent minimum + distance + estimated time.
-- Defaults benchmark Cairo 2026 local courier pricing while keeping all values admin-configurable.
alter table public.platform_commercial_settings
  add column if not exists delivery_pricing_enabled boolean not null default true,
  add column if not exists delivery_base_fee numeric(12,2) not null default 35,
  add column if not exists delivery_min_fee numeric(12,2) not null default 40,
  add column if not exists delivery_included_km numeric(8,2) not null default 3,
  add column if not exists delivery_per_extra_km numeric(12,2) not null default 5,
  add column if not exists delivery_per_minute numeric(12,2) not null default 0.50,
  add column if not exists delivery_road_factor numeric(6,3) not null default 1.25,
  add column if not exists delivery_avg_speed_kmh numeric(8,2) not null default 22,
  add column if not exists delivery_max_service_km numeric(8,2) not null default 30,
  add column if not exists delivery_max_fee numeric(12,2) not null default 250,
  add column if not exists delivery_round_step numeric(12,2) not null default 5;

alter table public.orders
  add column if not exists quoted_delivery_fee numeric(12,2),
  add column if not exists driver_fee_snapshot numeric(12,2),
  add column if not exists delivery_distance_km numeric(8,2),
  add column if not exists pricing_model text,
  add column if not exists pricing_details jsonb;

update public.orders set quoted_delivery_fee=coalesce(quoted_delivery_fee,delivery_fee),driver_fee_snapshot=coalesce(driver_fee_snapshot,delivery_fee),pricing_model=coalesce(pricing_model,'legacy_store_fee') where quoted_delivery_fee is null or driver_fee_snapshot is null or pricing_model is null;

-- Older approved stores may predate coordinate propagation.
update public.stores s set latitude=a.latitude,longitude=a.longitude,updated_at=now()
from public.merchant_applications a
where s.owner_id=a.applicant_id and s.name=a.business_name and (s.latitude is null or s.longitude is null) and a.latitude is not null and a.longitude is not null;

create or replace function public.calculate_delivery_quote(p_store_id uuid,p_address text)
returns table(customer_fee numeric,driver_gross_fee numeric,distance_km numeric,estimated_drive_minutes integer,pricing_model text,details jsonb)
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); s public.stores%rowtype; cfg public.platform_commercial_settings%rowtype; a public.addresses%rowtype; air_km numeric; road_km numeric; mins numeric; raw_fee numeric; final_fee numeric; step numeric;
begin
 if me is null then raise exception 'not authenticated'; end if;
 select * into s from public.stores where id=p_store_id and is_open=true; if not found then raise exception 'Store is unavailable'; end if;
 select * into cfg from public.platform_commercial_settings where id='global'; if cfg.id is null then raise exception 'Pricing configuration missing'; end if;
 select * into a from public.addresses where user_id=me and btrim(address_line)=btrim(coalesce(p_address,'')) order by is_default desc,created_at desc limit 1;
 if not cfg.delivery_pricing_enabled then
   final_fee:=greatest(0,coalesce(s.delivery_fee,0));
   return query select final_fee,final_fee,null::numeric,null::integer,'store_flat_fee'::text,jsonb_build_object('store_fee',final_fee,'reason','pricing_disabled'); return;
 end if;
 if s.latitude is null or s.longitude is null or a.latitude is null or a.longitude is null then
   final_fee:=greatest(coalesce(s.delivery_fee,0),cfg.delivery_min_fee);
   return query select final_fee,final_fee,null::numeric,null::integer,'safe_fallback'::text,jsonb_build_object('store_fee',coalesce(s.delivery_fee,0),'minimum_fee',cfg.delivery_min_fee,'reason','missing_coordinates'); return;
 end if;
 air_km:=6371*2*asin(sqrt(power(sin(radians(a.latitude-s.latitude)/2),2)+cos(radians(s.latitude))*cos(radians(a.latitude))*power(sin(radians(a.longitude-s.longitude)/2),2)));
 road_km:=greatest(0,air_km*cfg.delivery_road_factor);
 if road_km>cfg.delivery_max_service_km then raise exception 'عنوان التوصيل خارج نطاق الخدمة الحالي'; end if;
 mins:=case when cfg.delivery_avg_speed_kmh>0 then road_km/cfg.delivery_avg_speed_kmh*60 else 0 end;
 raw_fee:=cfg.delivery_base_fee+greatest(0,road_km-cfg.delivery_included_km)*cfg.delivery_per_extra_km+mins*cfg.delivery_per_minute;
 step:=greatest(0.01,cfg.delivery_round_step); final_fee:=ceil(raw_fee/step)*step; final_fee:=greatest(cfg.delivery_min_fee,least(cfg.delivery_max_fee,final_fee));
 return query select round(final_fee,2),round(final_fee,2),round(road_km,2),ceil(mins)::integer,'distance_time_upfront_v1'::text,jsonb_build_object('air_km',round(air_km,2),'road_factor',cfg.delivery_road_factor,'included_km',cfg.delivery_included_km,'per_extra_km',cfg.delivery_per_extra_km,'estimated_drive_minutes',ceil(mins),'per_minute',cfg.delivery_per_minute,'base_fee',cfg.delivery_base_fee,'minimum_fee',cfg.delivery_min_fee,'round_step',cfg.delivery_round_step);
end $$;
revoke all on function public.calculate_delivery_quote(uuid,text) from public,anon;
grant execute on function public.calculate_delivery_quote(uuid,text) to authenticated;

create or replace function public.admin_update_delivery_pricing(p_enabled boolean,p_base_fee numeric,p_min_fee numeric,p_included_km numeric,p_per_extra_km numeric,p_per_minute numeric,p_road_factor numeric,p_avg_speed_kmh numeric,p_max_service_km numeric,p_max_fee numeric,p_round_step numeric)
returns public.platform_commercial_settings language plpgsql security definer set search_path='' as $$
declare v public.platform_commercial_settings%rowtype;
begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if least(p_base_fee,p_min_fee,p_included_km,p_per_extra_km,p_per_minute,p_avg_speed_kmh,p_max_service_km,p_max_fee,p_round_step)<0 or p_road_factor<1 or p_road_factor>2 or p_avg_speed_kmh<5 or p_avg_speed_kmh>80 or p_max_service_km<1 or p_max_fee<p_min_fee or p_round_step<=0 then raise exception 'Invalid delivery pricing settings'; end if;
 update public.platform_commercial_settings set delivery_pricing_enabled=p_enabled,delivery_base_fee=p_base_fee,delivery_min_fee=p_min_fee,delivery_included_km=p_included_km,delivery_per_extra_km=p_per_extra_km,delivery_per_minute=p_per_minute,delivery_road_factor=p_road_factor,delivery_avg_speed_kmh=p_avg_speed_kmh,delivery_max_service_km=p_max_service_km,delivery_max_fee=p_max_fee,delivery_round_step=p_round_step,updated_at=now(),updated_by=auth.uid() where id='global' returning * into v;
 return v;
end $$;
revoke all on function public.admin_update_delivery_pricing(boolean,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from public,anon;
grant execute on function public.admin_update_delivery_pricing(boolean,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) to authenticated;

create or replace function public.create_order_idempotent(p_store_id uuid,p_items jsonb,p_address text,p_request_id uuid,p_payment_method text default 'cash',p_note text default '') returns public.orders language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_subtotal numeric(12,2); v_fee numeric(12,2); v_driver_fee numeric(12,2); v_total numeric(12,2); v_eta integer; v_order public.orders%rowtype; v_count integer; v_redemption uuid; q record;
begin
 if v_uid is null or not public.has_role('customer') then raise exception 'Customer authentication required'; end if;
 if not exists(select 1 from public.profiles where id=v_uid and is_active=true) then raise exception 'Account is inactive'; end if;
 if p_request_id is null then raise exception 'Request id is required'; end if;
 select * into v_order from public.orders where customer_id=v_uid and client_request_id=p_request_id; if found then return v_order; end if;
 if btrim(coalesce(p_address,''))='' then raise exception 'Delivery address is required'; end if;
 if p_payment_method not in ('cash','merchant_paid_online') then raise exception 'Unsupported payment method'; end if;
 select prep_minutes into v_eta from public.stores where id=p_store_id and is_open=true; if not found then raise exception 'Store is unavailable'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Order items required'; end if;
 select count(*) into v_count from jsonb_to_recordset(p_items) x(menu_item_id uuid,quantity integer);
 if exists(select 1 from jsonb_to_recordset(p_items) x(menu_item_id uuid,quantity integer) where x.quantity is null or x.quantity<1 or x.quantity>30) then raise exception 'Invalid quantity'; end if;
 if v_count<>(select count(distinct (x->>'menu_item_id')) from jsonb_array_elements(p_items) x) then raise exception 'Duplicate order item'; end if;
 if v_count<>(select count(*) from public.menu_items m where m.id in(select (x->>'menu_item_id')::uuid from jsonb_array_elements(p_items) x) and m.store_id=p_store_id and m.is_available=true) then raise exception 'One or more items are unavailable'; end if;
 select coalesce(sum(m.price*r.quantity),0) into v_subtotal from jsonb_to_recordset(p_items) r(menu_item_id uuid,quantity integer) join public.menu_items m on m.id=r.menu_item_id and m.store_id=p_store_id and m.is_available=true;
 select * into q from public.calculate_delivery_quote(p_store_id,p_address); v_fee:=q.customer_fee; v_driver_fee:=q.driver_gross_fee;
 select rr.id into v_redemption from public.reward_redemptions rr join public.reward_catalog rc on rc.id=rr.reward_id where rr.user_id=v_uid and rr.status='available' and (rr.expires_at is null or rr.expires_at>now()) and rc.reward_type='free_delivery' and rc.target_role in ('customer','all') order by rr.created_at limit 1 for update of rr skip locked;
 if v_redemption is not null then v_fee:=0; end if;
 v_total:=v_subtotal+coalesce(v_fee,0);
 begin
  insert into public.orders(customer_id,store_id,status,subtotal,delivery_fee,total,payment_method,delivery_address,customer_note,estimated_minutes,client_request_id,quoted_delivery_fee,driver_fee_snapshot,delivery_distance_km,pricing_model,pricing_details)
  values(v_uid,p_store_id,'pending',v_subtotal,coalesce(v_fee,0),v_total,p_payment_method,trim(p_address),coalesce(trim(p_note),''),coalesce(v_eta,20)+coalesce(q.estimated_drive_minutes,20),p_request_id,q.customer_fee,v_driver_fee,q.distance_km,q.pricing_model,q.details) returning * into v_order;
 exception when unique_violation then select * into v_order from public.orders where customer_id=v_uid and client_request_id=p_request_id; return v_order; end;
 insert into public.order_items(order_id,menu_item_id,name_snapshot,unit_price,quantity) select v_order.id,m.id,m.name,m.price,r.quantity from jsonb_to_recordset(p_items) r(menu_item_id uuid,quantity integer) join public.menu_items m on m.id=r.menu_item_id and m.store_id=p_store_id and m.is_available=true;
 if v_redemption is not null then update public.reward_redemptions set status='used',order_id=v_order.id,used_at=now() where id=v_redemption and status='available'; end if;
 return v_order;
end $$;

create or replace function public.driver_update_order(p_order_id uuid,p_status public.order_status) returns public.orders language plpgsql security definer set search_path='' as $$
declare v public.orders%rowtype; v_pct numeric; v_fee numeric; v_commission numeric; v_net numeric;
begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id and driver_id=auth.uid() and ((status='assigned' and p_status='picked_up') or (status='picked_up' and p_status='on_the_way') or (status='on_the_way' and p_status='delivered')) returning * into v;
 if not found then raise exception 'Invalid driver transition or permission'; end if;
 if p_status='delivered' then
  select driver_platform_commission_percent into v_pct from public.platform_commercial_settings where id='global'; v_pct:=coalesce(v_pct,0); v_fee:=coalesce(v.driver_fee_snapshot,v.quoted_delivery_fee,v.delivery_fee,0); v_commission:=round(v_fee*v_pct/100,2); v_net:=greatest(0,v_fee-v_commission);
  insert into public.driver_earnings(order_id,driver_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at) values(v.id,auth.uid(),v_fee,v_pct,v_commission,v_net,now()) on conflict(order_id) do nothing;
 end if;
 return v;
end $$;
