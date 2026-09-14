create or replace function public.settle_delivered_order()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare
 s public.platform_commercial_settings%rowtype;
 fleet public.fleet_companies%rowtype;
 fd public.fleet_drivers%rowtype;
 driver_wallet public.finance_wallets%rowtype;
 merchant_wallet public.finance_wallets%rowtype;
 fleet_wallet public.finance_wallets%rowtype;
 gross numeric:=coalesce(NEW.delivery_fee,0);
 driver_platform_pct numeric:=0;
 fleet_driver_pct numeric:=0;
 fleet_platform_pct numeric:=0;
 merchant_pct numeric:=0;
 rating_avg numeric:=0;
 bonus_pct numeric:=0;
 bonus_amount numeric:=0;
 driver_platform_amount numeric:=0;
 fleet_driver_amount numeric:=0;
 fleet_platform_amount numeric:=0;
 merchant_amount numeric:=0;
 merchant_owner uuid;
 rule jsonb;
begin
 if NEW.status<>'delivered' or (TG_OP='UPDATE' and OLD.status='delivered') then return NEW; end if;
 select * into s from public.platform_commercial_settings where id='global';

 if NEW.driver_id is not null then
   select * into fd from public.fleet_drivers where driver_id=NEW.driver_id and active limit 1;
   select coalesce(round(avg(rating)::numeric,2),0) into rating_avg from (select rating from public.driver_reviews where driver_id=NEW.driver_id order by created_at desc limit 100) q;
   if coalesce(s.rating_bonus_enabled,false) then
     select x into rule from jsonb_array_elements(coalesce(s.rating_bonus_rules,'[]'::jsonb)) x where rating_avg>=coalesce((x->>'min')::numeric,0) order by coalesce((x->>'min')::numeric,0) desc limit 1;
     bonus_pct:=coalesce((rule->>'bonus_percent')::numeric,0);
   end if;
   bonus_amount:=round(gross*bonus_pct/100,2);
   driver_wallet:=public.ensure_finance_wallet('driver',NEW.driver_id,null,null);

   if fd.driver_id is not null then
     select * into fleet from public.fleet_companies where id=fd.fleet_id;
     fleet_driver_pct:=coalesce(fd.commission_percent,fleet.driver_commission_percent,0);
     driver_platform_pct:=coalesce(s.fleet_driver_platform_commission_percent,0);
     fleet_platform_pct:=coalesce(fleet.platform_commission_percent,s.fleet_platform_commission_percent,0);
     fleet_wallet:=public.ensure_finance_wallet('fleet',null,null,fleet.id);
   else
     driver_platform_pct:=coalesce(s.driver_platform_commission_percent,0);
   end if;

   driver_platform_amount:=round(gross*driver_platform_pct/100,2);
   fleet_driver_amount:=round(gross*fleet_driver_pct/100,2);
   fleet_platform_amount:=round(gross*fleet_platform_pct/100,2);

   insert into public.driver_earnings(order_id,driver_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at,fleet_id,fleet_commission_percent,fleet_commission_amount,quality_bonus_percent,quality_bonus_amount,rating_snapshot,computed_at)
   values(NEW.id,NEW.driver_id,gross,driver_platform_pct,driver_platform_amount,greatest(0,gross+bonus_amount-driver_platform_amount-fleet_driver_amount),now(),case when fd.driver_id is null then null else fd.fleet_id end,fleet_driver_pct,fleet_driver_amount,bonus_pct,bonus_amount,rating_avg,now())
   on conflict(order_id) do update set driver_id=excluded.driver_id,gross_delivery_fee=excluded.gross_delivery_fee,platform_commission_percent=excluded.platform_commission_percent,platform_commission_amount=excluded.platform_commission_amount,driver_net_amount=excluded.driver_net_amount,fleet_id=excluded.fleet_id,fleet_commission_percent=excluded.fleet_commission_percent,fleet_commission_amount=excluded.fleet_commission_amount,quality_bonus_percent=excluded.quality_bonus_percent,quality_bonus_amount=excluded.quality_bonus_amount,rating_snapshot=excluded.rating_snapshot,computed_at=now();

   if driver_platform_amount>0 then perform public.post_finance_entry(driver_wallet.id,-driver_platform_amount,'platform_commission',NEW.id,'عمولة المنصة على التوصيل',null); end if;
   if fleet_driver_amount>0 and fd.driver_id is not null then
     insert into public.fleet_driver_ledger(fleet_id,driver_id,order_id,entry_type,amount,memo) values(fd.fleet_id,NEW.driver_id,NEW.id,'fleet_commission',-fleet_driver_amount,'عمولة الشركة من المندوب') on conflict do nothing;
   end if;
   if fleet_platform_amount>0 and fd.driver_id is not null then perform public.post_finance_entry(fleet_wallet.id,-fleet_platform_amount,'fleet_platform_commission',NEW.id,'عمولة المنصة على الشركة',null); end if;
 end if;

 select s2.owner_id into merchant_owner from public.stores s2 where s2.id=NEW.store_id;
 merchant_pct:=coalesce(s.merchant_platform_commission_percent,0);
 merchant_amount:=round(coalesce(NEW.subtotal,0)*merchant_pct/100,2);
 merchant_wallet:=public.ensure_finance_wallet('merchant',null,NEW.store_id,null);
 if merchant_amount>0 then perform public.post_finance_entry(merchant_wallet.id,-merchant_amount,'merchant_commission',NEW.id,'عمولة المنصة على التاجر',null); end if;
 return NEW;
end $$;
revoke all on function public.settle_delivered_order() from public,anon,authenticated;
grant execute on function public.settle_delivered_order() to service_role;
drop trigger if exists trg_settle_delivered_order on public.orders;
create trigger trg_settle_delivered_order after insert or update of status on public.orders for each row execute function public.settle_delivered_order();

create or replace function public.driver_accept_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path=''
as $$
declare v public.orders%rowtype; v_count integer; v_online boolean; w public.finance_wallets%rowtype; fd public.fleet_drivers%rowtype; fw public.finance_wallets%rowtype;
begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 select d.is_online into v_online from public.driver_status d where d.user_id=auth.uid() for update;
 if not found or not coalesce(v_online,false) then raise exception 'السائق لازم يكون أونلاين'; end if;
 w:=public.ensure_finance_wallet('driver',auth.uid(),null,null);
 if w.enforcement_enabled and w.debt_limit>0 and w.balance<=(-w.debt_limit) then raise exception 'محفظتك وصلت لحد المديونية. اشحن المحفظة قبل قبول طلبات جديدة.'; end if;
 select * into fd from public.fleet_drivers where driver_id=auth.uid() and active limit 1;
 if fd.driver_id is not null then
   fw:=public.ensure_finance_wallet('fleet',null,null,fd.fleet_id);
   if fw.enforcement_enabled and fw.debt_limit>0 and fw.balance<=(-fw.debt_limit) then raise exception 'حساب الشركة وصل لحد المديونية. تواصل مع مدير الشركة قبل قبول طلبات جديدة.'; end if;
   if not exists(select 1 from public.fleet_companies f where f.id=fd.fleet_id and f.status='active') then raise exception 'شركة التشغيل غير نشطة'; end if;
 end if;
 select count(*) into v_count from public.orders where driver_id=auth.uid() and status in ('assigned','picked_up','on_the_way');
 if v_count>=3 then raise exception 'وصلت للحد الأقصى: 3 طلبات نشطة'; end if;
 update public.orders o set driver_id=auth.uid(),status='assigned',updated_at=now() where o.id=p_order_id and o.status='ready' and o.driver_id is null returning o.* into v;
 if not found then raise exception 'Order no longer available'; end if;
 return v;
end $$;
revoke all on function public.driver_accept_order(uuid) from public,anon;
grant execute on function public.driver_accept_order(uuid) to authenticated;

create or replace function public.driver_update_order(p_order_id uuid,p_status public.order_status)
returns public.orders
language plpgsql security definer set search_path=''
as $$ declare v public.orders%rowtype; begin
 if auth.uid() is null or not public.is_driver() then raise exception 'Driver authorization required'; end if;
 update public.orders set status=p_status,updated_at=now() where id=p_order_id and driver_id=auth.uid() and ((status='assigned' and p_status='picked_up') or (status='picked_up' and p_status='on_the_way') or (status='on_the_way' and p_status='delivered')) returning * into v;
 if not found then raise exception 'Invalid driver transition or permission'; end if;
 return v;
end $$;
revoke all on function public.driver_update_order(uuid,public.order_status) from public,anon;
grant execute on function public.driver_update_order(uuid,public.order_status) to authenticated;

create or replace function public.merchant_update_order(p_order_id uuid,p_status public.order_status,p_estimated_minutes integer default null)
returns public.orders
language plpgsql security definer set search_path=''
as $$ declare v public.orders%rowtype; v_store uuid; w public.finance_wallets%rowtype; begin
 if auth.uid() is null or not public.has_role('merchant') then raise exception 'Merchant authorization required'; end if;
 select o.store_id into v_store from public.orders o join public.stores s on s.id=o.store_id where o.id=p_order_id and s.owner_id=auth.uid();
 if v_store is null or not public.merchant_access_allowed(v_store) then raise exception 'Merchant service is disabled or subscription expired'; end if;
 if p_status='accepted' then
   w:=public.ensure_finance_wallet('merchant',null,v_store,null);
   if w.enforcement_enabled and w.debt_limit>0 and w.balance<=(-w.debt_limit) then raise exception 'محفظة المتجر وصلت لحد المديونية. اشحن المحفظة قبل قبول طلبات جديدة.'; end if;
 end if;
 update public.orders o set status=p_status,estimated_minutes=coalesce(p_estimated_minutes,o.estimated_minutes),updated_at=now() where o.id=p_order_id and o.store_id=v_store and ((o.status='pending' and p_status in ('accepted','rejected')) or (o.status='accepted' and p_status='preparing' and (o.scheduled_for is null or o.scheduled_for<=now()+interval '90 minutes')) or (o.status='preparing' and p_status='ready')) returning o.* into v;
 if not found then raise exception 'Invalid merchant transition, schedule window, or permission'; end if;
 return v;
end $$;
revoke all on function public.merchant_update_order(uuid,public.order_status,integer) from public,anon;
grant execute on function public.merchant_update_order(uuid,public.order_status,integer) to authenticated;

create or replace function public.award_order_rewards()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare cfg public.loyalty_settings%rowtype; earned integer; claim public.referral_claims; merchant_owner uuid; ref_points integer;
begin
 if NEW.status='delivered' and (TG_OP='INSERT' or OLD.status is distinct from NEW.status) then
   select * into cfg from public.loyalty_settings where id='global';
   if not coalesce(cfg.rewards_enabled,true) then return NEW; end if;
   ref_points:=coalesce(cfg.referral_points,50);
   if NEW.customer_id is not null then
     perform public.ensure_reward_wallet(NEW.customer_id);
     earned:=greatest(0,floor((coalesce(NEW.total,0)/10)*coalesce(cfg.customer_points_per_10,1))::integer);
     if earned>0 then
       insert into public.reward_events(user_id,points_delta,source,order_id,note) values(NEW.customer_id,earned,'order_delivered',NEW.id,'نقاط طلب مكتمل') on conflict do nothing;
       if found then update public.reward_wallets set points=points+earned,lifetime_points=lifetime_points+earned,updated_at=now() where user_id=NEW.customer_id; end if;
     end if;
     select * into claim from public.referral_claims where referred_user_id=NEW.customer_id and rewarded_at is null;
     if claim.referred_user_id is not null and ref_points>0 then
       perform public.ensure_reward_wallet(claim.referrer_user_id);
       insert into public.reward_events(user_id,points_delta,source,order_id,note) values(claim.referrer_user_id,ref_points,'referral_referrer',NEW.id,'مكافأة دعوة صديق');
       insert into public.reward_events(user_id,points_delta,source,order_id,note) values(NEW.customer_id,ref_points,'referral_referred',NEW.id,'مكافأة أول طلب بعد الدعوة');
       update public.reward_wallets set points=points+ref_points,lifetime_points=lifetime_points+ref_points,updated_at=now() where user_id in (claim.referrer_user_id,NEW.customer_id);
       update public.referral_claims set rewarded_at=now() where referred_user_id=NEW.customer_id and rewarded_at is null;
     end if;
   end if;
   if NEW.driver_id is not null and coalesce(cfg.driver_points_per_delivery,0)>0 then
     perform public.ensure_reward_wallet(NEW.driver_id);
     insert into public.reward_events(user_id,points_delta,source,order_id,note) values(NEW.driver_id,cfg.driver_points_per_delivery,'driver_delivery',NEW.id,'نقاط توصيل مكتمل') on conflict do nothing;
     if found then update public.reward_wallets set points=points+cfg.driver_points_per_delivery,lifetime_points=lifetime_points+cfg.driver_points_per_delivery,updated_at=now() where user_id=NEW.driver_id; end if;
   end if;
   select owner_id into merchant_owner from public.stores where id=NEW.store_id;
   if merchant_owner is not null and coalesce(cfg.merchant_points_per_delivered_order,0)>0 then
     perform public.ensure_reward_wallet(merchant_owner);
     insert into public.reward_events(user_id,points_delta,source,order_id,note) values(merchant_owner,cfg.merchant_points_per_delivered_order,'merchant_order',NEW.id,'نقاط طلب متجر مكتمل') on conflict do nothing;
     if found then update public.reward_wallets set points=points+cfg.merchant_points_per_delivered_order,lifetime_points=lifetime_points+cfg.merchant_points_per_delivered_order,updated_at=now() where user_id=merchant_owner; end if;
   end if;
 end if;
 return NEW;
end $$;
revoke all on function public.award_order_rewards() from public,anon,authenticated;
grant execute on function public.award_order_rewards() to service_role;
