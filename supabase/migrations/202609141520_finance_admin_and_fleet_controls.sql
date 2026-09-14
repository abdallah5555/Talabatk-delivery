create or replace function public.admin_update_finance_settings(
 p_direct_driver_percent numeric,
 p_fleet_driver_platform_percent numeric,
 p_fleet_platform_percent numeric,
 p_merchant_percent numeric,
 p_enforcement_enabled boolean,
 p_driver_debt_limit numeric,
 p_merchant_debt_limit numeric,
 p_fleet_debt_limit numeric,
 p_rating_bonus_enabled boolean,
 p_rating_bonus_rules jsonb
)
returns public.platform_commercial_settings
language plpgsql security definer set search_path=''
as $$ declare v public.platform_commercial_settings%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_direct_driver_percent not between 0 and 100 or p_fleet_driver_platform_percent not between 0 and 100 or p_fleet_platform_percent not between 0 and 100 or p_merchant_percent not between 0 and 100 then raise exception 'Commission must be between 0 and 100'; end if;
 if p_driver_debt_limit<0 or p_merchant_debt_limit<0 or p_fleet_debt_limit<0 then raise exception 'Debt limits cannot be negative'; end if;
 if jsonb_typeof(p_rating_bonus_rules)<>'array' then raise exception 'Invalid rating rules'; end if;
 update public.platform_commercial_settings set
  driver_platform_commission_percent=p_direct_driver_percent,
  fleet_driver_platform_commission_percent=p_fleet_driver_platform_percent,
  fleet_platform_commission_percent=p_fleet_platform_percent,
  merchant_platform_commission_percent=p_merchant_percent,
  wallet_enforcement_enabled=p_enforcement_enabled,
  driver_debt_limit=p_driver_debt_limit,
  merchant_debt_limit=p_merchant_debt_limit,
  fleet_debt_limit=p_fleet_debt_limit,
  rating_bonus_enabled=p_rating_bonus_enabled,
  rating_bonus_rules=p_rating_bonus_rules,
  updated_at=now(),updated_by=auth.uid()
 where id='global' returning * into v;
 update public.finance_wallets set
  enforcement_enabled=p_enforcement_enabled,
  debt_limit=case owner_kind when 'driver' then p_driver_debt_limit when 'merchant' then p_merchant_debt_limit when 'fleet' then coalesce((select f.debt_limit from public.fleet_companies f where f.id=finance_wallets.fleet_id),p_fleet_debt_limit) else debt_limit end,
  updated_at=now();
 return v;
end $$;
revoke all on function public.admin_update_finance_settings(numeric,numeric,numeric,numeric,boolean,numeric,numeric,numeric,boolean,jsonb) from public,anon;
grant execute on function public.admin_update_finance_settings(numeric,numeric,numeric,numeric,boolean,numeric,numeric,numeric,boolean,jsonb) to authenticated;

create or replace function public.admin_upsert_reward_catalog(
 p_id uuid,
 p_title text,
 p_description text,
 p_target_role text,
 p_reward_type text,
 p_points_cost integer,
 p_reward_value numeric,
 p_active boolean
)
returns public.reward_catalog
language plpgsql security definer set search_path=''
as $$ declare v public.reward_catalog%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_target_role not in ('customer','driver','merchant','all') then raise exception 'Invalid target role'; end if;
 if p_reward_type not in ('free_delivery','commission_free_next_order','priority_badge','custom') then raise exception 'Invalid reward type'; end if;
 if p_points_cost<=0 then raise exception 'Points cost must be positive'; end if;
 if p_id is null then
  insert into public.reward_catalog(title,description,target_role,reward_type,points_cost,reward_value,active,updated_by)
  values(trim(p_title),nullif(trim(coalesce(p_description,'')),''),p_target_role,p_reward_type,p_points_cost,p_reward_value,p_active,auth.uid()) returning * into v;
 else
  update public.reward_catalog set title=trim(p_title),description=nullif(trim(coalesce(p_description,'')),''),target_role=p_target_role,reward_type=p_reward_type,points_cost=p_points_cost,reward_value=p_reward_value,active=p_active,updated_at=now(),updated_by=auth.uid() where id=p_id returning * into v;
  if not found then raise exception 'Reward not found'; end if;
 end if;
 return v;
end $$;
revoke all on function public.admin_upsert_reward_catalog(uuid,text,text,text,text,integer,numeric,boolean) from public,anon;
grant execute on function public.admin_upsert_reward_catalog(uuid,text,text,text,text,integer,numeric,boolean) to authenticated;

create or replace function public.fleet_record_driver_settlement(p_driver_id uuid,p_amount numeric,p_note text default null)
returns public.fleet_driver_ledger
language plpgsql security definer set search_path=''
as $$ declare f public.fleet_companies%rowtype; e public.fleet_driver_ledger%rowtype; begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select * into f from public.fleet_companies where owner_user_id=auth.uid() and status='active' limit 1;
 if f.id is null then raise exception 'Fleet manager authorization required'; end if;
 if not exists(select 1 from public.fleet_drivers where fleet_id=f.id and driver_id=p_driver_id and active) then raise exception 'Driver is not in your fleet'; end if;
 if p_amount<=0 then raise exception 'Settlement amount must be positive'; end if;
 insert into public.fleet_driver_ledger(fleet_id,driver_id,entry_type,amount,memo,created_by) values(f.id,p_driver_id,'settlement',round(p_amount,2),coalesce(nullif(trim(p_note),''),'تسوية مع المندوب'),auth.uid()) returning * into e;
 return e;
end $$;
revoke all on function public.fleet_record_driver_settlement(uuid,numeric,text) from public,anon;
grant execute on function public.fleet_record_driver_settlement(uuid,numeric,text) to authenticated;

create or replace function public.get_my_fleet_drivers()
returns table(driver_id uuid,full_name text,phone text,commission_percent numeric,joined_at timestamptz,balance numeric,avg_rating numeric,delivered_30d bigint)
language plpgsql stable security definer set search_path=''
as $$ declare fleet_id_value uuid; begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 select id into fleet_id_value from public.fleet_companies where owner_user_id=auth.uid() and status<>'closed' limit 1;
 if fleet_id_value is null then return; end if;
 return query
 select fd.driver_id,p.full_name,p.phone,fd.commission_percent,fd.joined_at,
  coalesce((select sum(l.amount) from public.fleet_driver_ledger l where l.fleet_id=fd.fleet_id and l.driver_id=fd.driver_id),0)::numeric,
  coalesce((select round(avg(x.rating)::numeric,2) from (select rating from public.driver_reviews where driver_id=fd.driver_id order by created_at desc limit 100) x),0)::numeric,
  (select count(*) from public.orders o where o.driver_id=fd.driver_id and o.status='delivered' and o.updated_at>=now()-interval '30 days')::bigint
 from public.fleet_drivers fd left join public.profiles p on p.id=fd.driver_id
 where fd.fleet_id=fleet_id_value and fd.active
 order by p.full_name nulls last,fd.joined_at;
end $$;
revoke all on function public.get_my_fleet_drivers() from public,anon;
grant execute on function public.get_my_fleet_drivers() to authenticated;

create or replace function public.get_my_fleet_summary()
returns table(fleet_id uuid,fleet_name text,fleet_status text,driver_commission_percent numeric,platform_commission_percent numeric,drivers_count bigint,wallet_balance numeric,debt_limit numeric,blocked boolean)
language sql stable security definer set search_path=''
as $$
 select f.id,f.name,f.status,f.driver_commission_percent,coalesce(f.platform_commission_percent,s.fleet_platform_commission_percent),
  (select count(*) from public.fleet_drivers fd where fd.fleet_id=f.id and fd.active),
  coalesce(w.balance,0),coalesce(w.debt_limit,coalesce(f.debt_limit,s.fleet_debt_limit)),
  coalesce(w.enforcement_enabled and w.debt_limit>0 and w.balance<=(-w.debt_limit),false)
 from public.fleet_companies f
 cross join public.platform_commercial_settings s
 left join public.finance_wallets w on w.fleet_id=f.id and w.owner_kind='fleet'
 where f.owner_user_id=auth.uid() and s.id='global'
 limit 1
$$;
revoke all on function public.get_my_fleet_summary() from public,anon;
grant execute on function public.get_my_fleet_summary() to authenticated;
