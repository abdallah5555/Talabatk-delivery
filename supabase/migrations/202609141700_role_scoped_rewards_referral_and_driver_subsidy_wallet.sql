-- Role-scoped rewards, registration-only referrals, and driver wallet subsidy settlement.
-- Referral reward is intentionally fixed at 50 points in this release.

update public.loyalty_settings
set referral_points = 50,
    updated_at = now()
where id = 'global';

create or replace function public.claim_referral_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  raise exception 'referral code is registration-only';
end;
$$;
revoke all on function public.claim_referral_code(text) from public, anon;
grant execute on function public.claim_referral_code(text) to authenticated;

create or replace function public.award_signup_referral_if_eligible(p_user_id uuid, p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.referral_claims%rowtype;
  reward_points constant integer := 50;
begin
  if p_user_id is null or p_order_id is null then return false; end if;

  select * into c
  from public.referral_claims
  where referred_user_id = p_user_id
    and rewarded_at is null
  for update;

  if c.referred_user_id is null then return false; end if;

  perform public.ensure_reward_wallet(c.referrer_user_id);
  perform public.ensure_reward_wallet(p_user_id);

  insert into public.reward_events(user_id, points_delta, source, order_id, note)
  values(c.referrer_user_id, reward_points, 'referral_referrer', p_order_id, 'مكافأة دعوة مستخدم جديد')
  on conflict do nothing;

  insert into public.reward_events(user_id, points_delta, source, order_id, note)
  values(p_user_id, reward_points, 'referral_referred', p_order_id, 'مكافأة أول نشاط مكتمل بعد التسجيل بكود دعوة')
  on conflict do nothing;

  update public.reward_wallets
  set points = points + reward_points,
      lifetime_points = lifetime_points + reward_points,
      updated_at = now()
  where user_id in (c.referrer_user_id, p_user_id);

  update public.referral_claims
  set rewarded_at = now()
  where referred_user_id = p_user_id
    and rewarded_at is null;

  return true;
end;
$$;
revoke all on function public.award_signup_referral_if_eligible(uuid, uuid) from public, anon, authenticated;
grant execute on function public.award_signup_referral_if_eligible(uuid, uuid) to service_role;

create or replace function public.award_order_rewards()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg public.loyalty_settings%rowtype;
  earned integer;
  merchant_owner uuid;
begin
  if NEW.status = 'delivered' and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    select * into cfg from public.loyalty_settings where id = 'global';
    if not coalesce(cfg.rewards_enabled, true) then return NEW; end if;

    if NEW.customer_id is not null then
      perform public.ensure_reward_wallet(NEW.customer_id);
      earned := greatest(0, floor((coalesce(NEW.total,0) / 10) * coalesce(cfg.customer_points_per_10,1))::integer);
      if earned > 0 then
        insert into public.reward_events(user_id, points_delta, source, order_id, note)
        values(NEW.customer_id, earned, 'order_delivered', NEW.id, 'نقاط طلب مكتمل')
        on conflict do nothing;
        if found then
          update public.reward_wallets
          set points = points + earned,
              lifetime_points = lifetime_points + earned,
              updated_at = now()
          where user_id = NEW.customer_id;
        end if;
      end if;
      perform public.award_signup_referral_if_eligible(NEW.customer_id, NEW.id);
    end if;

    if NEW.driver_id is not null and coalesce(cfg.driver_points_per_delivery,0) > 0 then
      perform public.ensure_reward_wallet(NEW.driver_id);
      insert into public.reward_events(user_id, points_delta, source, order_id, note)
      values(NEW.driver_id, cfg.driver_points_per_delivery, 'driver_delivery', NEW.id, 'نقاط توصيل مكتمل')
      on conflict do nothing;
      if found then
        update public.reward_wallets
        set points = points + cfg.driver_points_per_delivery,
            lifetime_points = lifetime_points + cfg.driver_points_per_delivery,
            updated_at = now()
        where user_id = NEW.driver_id;
      end if;
    end if;
    if NEW.driver_id is not null then
      perform public.award_signup_referral_if_eligible(NEW.driver_id, NEW.id);
    end if;

    select owner_id into merchant_owner from public.stores where id = NEW.store_id;
    if merchant_owner is not null and coalesce(cfg.merchant_points_per_delivered_order,0) > 0 then
      perform public.ensure_reward_wallet(merchant_owner);
      insert into public.reward_events(user_id, points_delta, source, order_id, note)
      values(merchant_owner, cfg.merchant_points_per_delivered_order, 'merchant_order', NEW.id, 'نقاط طلب متجر مكتمل')
      on conflict do nothing;
      if found then
        update public.reward_wallets
        set points = points + cfg.merchant_points_per_delivered_order,
            lifetime_points = lifetime_points + cfg.merchant_points_per_delivered_order,
            updated_at = now()
        where user_id = merchant_owner;
      end if;
    end if;
    if merchant_owner is not null then
      perform public.award_signup_referral_if_eligible(merchant_owner, NEW.id);
    end if;
  end if;
  return NEW;
end;
$$;

create or replace function public.settle_delivered_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
 s public.platform_commercial_settings%rowtype; fleet public.fleet_companies%rowtype; fd public.fleet_drivers%rowtype;
 driver_wallet public.finance_wallets%rowtype; merchant_wallet public.finance_wallets%rowtype; fleet_wallet public.finance_wallets%rowtype;
 gross numeric:=coalesce(NEW.driver_fee_snapshot,NEW.quoted_delivery_fee,NEW.delivery_fee,0); customer_delivery_paid numeric:=greatest(0,coalesce(NEW.delivery_fee,0)); subsidy_credit numeric:=0;
 driver_platform_pct numeric:=0; fleet_driver_pct numeric:=0; fleet_platform_pct numeric:=0; merchant_pct numeric:=0;
 rating_avg numeric:=0; bonus_pct numeric:=0; bonus_amount numeric:=0; driver_platform_amount numeric:=0; fleet_driver_amount numeric:=0; fleet_platform_amount numeric:=0; merchant_amount numeric:=0;
 merchant_owner uuid; rule jsonb; driver_reward uuid; merchant_reward uuid;
begin
 if NEW.status<>'delivered' or (TG_OP='UPDATE' and OLD.status='delivered') then return NEW; end if;
 select * into s from public.platform_commercial_settings where id='global';
 if NEW.driver_id is not null then
   select * into fd from public.fleet_drivers where driver_id=NEW.driver_id and active limit 1;
   select coalesce(round(avg(rating)::numeric,2),0) into rating_avg from (select rating from public.driver_reviews where driver_id=NEW.driver_id order by created_at desc limit 100) q;
   if coalesce(s.rating_bonus_enabled,false) then select x into rule from jsonb_array_elements(coalesce(s.rating_bonus_rules,'[]'::jsonb)) x where rating_avg>=coalesce((x->>'min')::numeric,0) order by coalesce((x->>'min')::numeric,0) desc limit 1; bonus_pct:=coalesce((rule->>'bonus_percent')::numeric,0); end if;
   bonus_amount:=round(gross*bonus_pct/100,2); driver_wallet:=public.ensure_finance_wallet('driver',NEW.driver_id,null,null);
   if fd.driver_id is not null then select * into fleet from public.fleet_companies where id=fd.fleet_id; fleet_driver_pct:=coalesce(fd.commission_percent,fleet.driver_commission_percent,0); driver_platform_pct:=coalesce(s.fleet_driver_platform_commission_percent,0); fleet_platform_pct:=coalesce(fleet.platform_commission_percent,s.fleet_platform_commission_percent,0); fleet_wallet:=public.ensure_finance_wallet('fleet',null,null,fleet.id); else driver_platform_pct:=coalesce(s.driver_platform_commission_percent,0); end if;
   select rr.id into driver_reward from public.reward_redemptions rr join public.reward_catalog rc on rc.id=rr.reward_id where rr.user_id=NEW.driver_id and rr.status='available' and (rr.expires_at is null or rr.expires_at>now()) and rc.reward_type='commission_free_next_order' and rc.target_role in ('driver','all') order by rr.created_at limit 1 for update of rr skip locked;
   if driver_reward is not null then driver_platform_pct:=0; update public.reward_redemptions set status='used',order_id=NEW.id,used_at=now() where id=driver_reward and status='available'; end if;
   driver_platform_amount:=round(gross*driver_platform_pct/100,2); fleet_driver_amount:=round(gross*fleet_driver_pct/100,2); fleet_platform_amount:=round(gross*fleet_platform_pct/100,2);
   insert into public.driver_earnings(order_id,driver_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at,fleet_id,fleet_commission_percent,fleet_commission_amount,quality_bonus_percent,quality_bonus_amount,rating_snapshot,computed_at)
   values(NEW.id,NEW.driver_id,gross,driver_platform_pct,driver_platform_amount,greatest(0,gross+bonus_amount-driver_platform_amount-fleet_driver_amount),now(),case when fd.driver_id is null then null else fd.fleet_id end,fleet_driver_pct,fleet_driver_amount,bonus_pct,bonus_amount,rating_avg,now())
   on conflict(order_id) do update set driver_id=excluded.driver_id,gross_delivery_fee=excluded.gross_delivery_fee,platform_commission_percent=excluded.platform_commission_percent,platform_commission_amount=excluded.platform_commission_amount,driver_net_amount=excluded.driver_net_amount,fleet_id=excluded.fleet_id,fleet_commission_percent=excluded.fleet_commission_percent,fleet_commission_amount=excluded.fleet_commission_amount,quality_bonus_percent=excluded.quality_bonus_percent,quality_bonus_amount=excluded.quality_bonus_amount,rating_snapshot=excluded.rating_snapshot,computed_at=now();

   -- If the customer paid less delivery than the driver's gross fee (e.g. free-delivery reward),
   -- the platform owes the difference to the driver. A positive wallet balance offsets existing debt
   -- and is automatically consumed by future negative commission entries.
   subsidy_credit:=round(greatest(0,gross-customer_delivery_paid),2);
   if subsidy_credit>0 then
     perform public.post_finance_entry(driver_wallet.id,subsidy_credit,'delivery_subsidy_credit',NEW.id,'رصيد توصيل لم يدفعه العميل',null);
   end if;

   if driver_platform_amount>0 then perform public.post_finance_entry(driver_wallet.id,-driver_platform_amount,'platform_commission',NEW.id,'عمولة المنصة على التوصيل',null); end if;
   if fleet_driver_amount>0 and fd.driver_id is not null then insert into public.fleet_driver_ledger(fleet_id,driver_id,order_id,entry_type,amount,memo) values(fd.fleet_id,NEW.driver_id,NEW.id,'fleet_commission',-fleet_driver_amount,'عمولة الشركة من المندوب') on conflict do nothing; end if;
   if fleet_platform_amount>0 and fd.driver_id is not null then perform public.post_finance_entry(fleet_wallet.id,-fleet_platform_amount,'fleet_platform_commission',NEW.id,'عمولة المنصة على الشركة',null); end if;
 end if;
 select owner_id into merchant_owner from public.stores where id=NEW.store_id;
 merchant_pct:=coalesce(s.merchant_platform_commission_percent,0);
 if merchant_owner is not null then select rr.id into merchant_reward from public.reward_redemptions rr join public.reward_catalog rc on rc.id=rr.reward_id where rr.user_id=merchant_owner and rr.status='available' and (rr.expires_at is null or rr.expires_at>now()) and rc.reward_type='commission_free_next_order' and rc.target_role in ('merchant','all') order by rr.created_at limit 1 for update of rr skip locked; end if;
 if merchant_reward is not null then merchant_pct:=0; update public.reward_redemptions set status='used',order_id=NEW.id,used_at=now() where id=merchant_reward and status='available'; end if;
 merchant_amount:=round(coalesce(NEW.subtotal,0)*merchant_pct/100,2); merchant_wallet:=public.ensure_finance_wallet('merchant',null,NEW.store_id,null);
 if merchant_amount>0 then perform public.post_finance_entry(merchant_wallet.id,-merchant_amount,'merchant_commission',NEW.id,'عمولة المنصة على التاجر',null); end if;
 return NEW;
end;
$$;

-- Customer profile RPCs are authenticated-only; anon access is unnecessary.
revoke all on function public.get_my_profile_details() from public, anon;
grant execute on function public.get_my_profile_details() to authenticated;
revoke all on function public.update_my_profile_details(text,text,text,text,text) from public, anon;
grant execute on function public.update_my_profile_details(text,text,text,text,text) to authenticated;
