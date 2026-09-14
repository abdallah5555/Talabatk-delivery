-- Fleet/company hierarchy, finance ledgers, configurable rewards, and quality-aware settlement.

alter table public.platform_commercial_settings
  add column if not exists merchant_platform_commission_percent numeric(5,2) not null default 0 check (merchant_platform_commission_percent between 0 and 100),
  add column if not exists fleet_platform_commission_percent numeric(5,2) not null default 0 check (fleet_platform_commission_percent between 0 and 100),
  add column if not exists fleet_driver_platform_commission_percent numeric(5,2) not null default 0 check (fleet_driver_platform_commission_percent between 0 and 100),
  add column if not exists wallet_enforcement_enabled boolean not null default false,
  add column if not exists driver_debt_limit numeric(12,2) not null default 500 check (driver_debt_limit>=0),
  add column if not exists merchant_debt_limit numeric(12,2) not null default 1000 check (merchant_debt_limit>=0),
  add column if not exists fleet_debt_limit numeric(12,2) not null default 3000 check (fleet_debt_limit>=0),
  add column if not exists rating_bonus_enabled boolean not null default false,
  add column if not exists rating_bonus_rules jsonb not null default '[{"min":4.8,"bonus_percent":10},{"min":4.6,"bonus_percent":5},{"min":4.2,"bonus_percent":0},{"min":0,"bonus_percent":0}]'::jsonb;

create table if not exists public.fleet_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 2 and 120),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check(status in ('active','suspended','closed')),
  driver_commission_percent numeric(5,2) not null default 0 check(driver_commission_percent between 0 and 100),
  platform_commission_percent numeric(5,2) null check(platform_commission_percent between 0 and 100),
  debt_limit numeric(12,2) null check(debt_limit is null or debt_limit>=0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create unique index if not exists fleet_companies_owner_unique on public.fleet_companies(owner_user_id) where status<>'closed';

create table if not exists public.fleet_drivers (
  fleet_id uuid not null references public.fleet_companies(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  commission_percent numeric(5,2) null check(commission_percent between 0 and 100),
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(fleet_id,driver_id)
);
create unique index if not exists fleet_driver_one_active_company on public.fleet_drivers(driver_id) where active;

create table if not exists public.finance_wallets (
  id uuid primary key default gen_random_uuid(),
  owner_kind text not null check(owner_kind in ('driver','merchant','fleet')),
  owner_user_id uuid references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  fleet_id uuid references public.fleet_companies(id) on delete cascade,
  balance numeric(14,2) not null default 0,
  debt_limit numeric(12,2) not null default 0 check(debt_limit>=0),
  enforcement_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  check(
    (owner_kind='driver' and owner_user_id is not null and store_id is null and fleet_id is null) or
    (owner_kind='merchant' and owner_user_id is null and store_id is not null and fleet_id is null) or
    (owner_kind='fleet' and owner_user_id is null and store_id is null and fleet_id is not null)
  )
);
create unique index if not exists finance_wallet_driver_unique on public.finance_wallets(owner_user_id) where owner_kind='driver';
create unique index if not exists finance_wallet_merchant_unique on public.finance_wallets(store_id) where owner_kind='merchant';
create unique index if not exists finance_wallet_fleet_unique on public.finance_wallets(fleet_id) where owner_kind='fleet';

create table if not exists public.finance_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.finance_wallets(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  entry_type text not null check(entry_type in ('platform_commission','merchant_commission','fleet_platform_commission','fleet_driver_platform_commission','topup','admin_adjustment','reward_credit','reversal')),
  amount numeric(14,2) not null check(amount<>0),
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create unique index if not exists finance_ledger_order_type_unique on public.finance_ledger(wallet_id,order_id,entry_type) where order_id is not null and entry_type not in ('admin_adjustment','topup','reversal');
create index if not exists finance_ledger_wallet_created_idx on public.finance_ledger(wallet_id,created_at desc);

create table if not exists public.fleet_driver_ledger (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.fleet_companies(id) on delete cascade,
  driver_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  entry_type text not null check(entry_type in ('fleet_commission','settlement','adjustment','reversal')),
  amount numeric(14,2) not null check(amount<>0),
  memo text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create unique index if not exists fleet_driver_ledger_order_commission_unique on public.fleet_driver_ledger(fleet_id,driver_id,order_id,entry_type) where order_id is not null and entry_type='fleet_commission';
create index if not exists fleet_driver_ledger_driver_created_idx on public.fleet_driver_ledger(driver_id,created_at desc);

alter table public.driver_earnings
  add column if not exists fleet_id uuid references public.fleet_companies(id) on delete set null,
  add column if not exists fleet_commission_percent numeric(5,2) not null default 0,
  add column if not exists fleet_commission_amount numeric(12,2) not null default 0,
  add column if not exists quality_bonus_percent numeric(5,2) not null default 0,
  add column if not exists quality_bonus_amount numeric(12,2) not null default 0,
  add column if not exists rating_snapshot numeric(3,2),
  add column if not exists computed_at timestamptz not null default now();

create table if not exists public.loyalty_settings (
  id text primary key default 'global' check(id='global'),
  customer_points_per_10 numeric(8,2) not null default 1 check(customer_points_per_10>=0),
  driver_points_per_delivery integer not null default 5 check(driver_points_per_delivery>=0),
  merchant_points_per_delivered_order integer not null default 3 check(merchant_points_per_delivered_order>=0),
  referral_points integer not null default 50 check(referral_points>=0),
  rewards_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.loyalty_settings(id) values('global') on conflict(id) do nothing;

alter table public.reward_events drop constraint if exists reward_events_source_check;
alter table public.reward_events add constraint reward_events_source_check check(source in ('order_delivered','driver_delivery','merchant_order','referral_referrer','referral_referred','admin_adjustment','reward_redemption'));
create unique index if not exists reward_events_driver_delivery_unique on public.reward_events(user_id,order_id) where source='driver_delivery' and order_id is not null;
create unique index if not exists reward_events_merchant_order_unique on public.reward_events(user_id,order_id) where source='merchant_order' and order_id is not null;

create table if not exists public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  target_role text not null default 'customer' check(target_role in ('customer','driver','merchant','all')),
  reward_type text not null check(reward_type in ('free_delivery','commission_free_next_order','priority_badge','custom')),
  points_cost integer not null check(points_cost>0),
  reward_value numeric(12,2),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.reward_catalog(id) on delete restrict,
  points_spent integer not null check(points_spent>0),
  status text not null default 'available' check(status in ('available','used','cancelled','expired')),
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  expires_at timestamptz
);
create index if not exists reward_redemptions_user_status_idx on public.reward_redemptions(user_id,status,created_at desc);

insert into public.reward_catalog(title,description,target_role,reward_type,points_cost,reward_value,active,sort_order)
select 'توصيل مجاني للطلب القادم','رصيد مكافأة يطبق على رسوم التوصيل في طلب مؤهل.','customer','free_delivery',300,null,true,10
where not exists(select 1 from public.reward_catalog where reward_type='free_delivery' and target_role='customer');
insert into public.reward_catalog(title,description,target_role,reward_type,points_cost,reward_value,active,sort_order)
select 'طلب بدون عمولة منصة','يتحول لمكافأة على أول طلب مؤهل بعد تفعيل العمولات.','driver','commission_free_next_order',500,null,false,20
where not exists(select 1 from public.reward_catalog where reward_type='commission_free_next_order' and target_role='driver');
insert into public.reward_catalog(title,description,target_role,reward_type,points_cost,reward_value,active,sort_order)
select 'طلب بدون عمولة منصة','يتحول لمكافأة على أول طلب مؤهل بعد تفعيل عمولة التاجر.','merchant','commission_free_next_order',700,null,false,30
where not exists(select 1 from public.reward_catalog where reward_type='commission_free_next_order' and target_role='merchant');

alter table public.fleet_companies enable row level security;
alter table public.fleet_drivers enable row level security;
alter table public.finance_wallets enable row level security;
alter table public.finance_ledger enable row level security;
alter table public.fleet_driver_ledger enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.reward_redemptions enable row level security;

revoke all on public.fleet_companies,public.fleet_drivers,public.finance_wallets,public.finance_ledger,public.fleet_driver_ledger,public.loyalty_settings,public.reward_catalog,public.reward_redemptions from anon;
grant select on public.fleet_companies,public.fleet_drivers,public.finance_wallets,public.finance_ledger,public.fleet_driver_ledger,public.loyalty_settings,public.reward_catalog,public.reward_redemptions to authenticated;

create policy fleet_companies_admin_read on public.fleet_companies for select to authenticated using(public.has_role('admin') or owner_user_id=auth.uid());
create policy fleet_drivers_read on public.fleet_drivers for select to authenticated using(public.has_role('admin') or driver_id=auth.uid() or exists(select 1 from public.fleet_companies f where f.id=fleet_id and f.owner_user_id=auth.uid()));
create policy finance_wallets_read on public.finance_wallets for select to authenticated using(
 public.has_role('admin') or
 (owner_kind='driver' and owner_user_id=auth.uid()) or
 (owner_kind='merchant' and exists(select 1 from public.stores s where s.id=store_id and s.owner_id=auth.uid())) or
 (owner_kind='fleet' and exists(select 1 from public.fleet_companies f where f.id=fleet_id and f.owner_user_id=auth.uid()))
);
create policy finance_ledger_read on public.finance_ledger for select to authenticated using(exists(select 1 from public.finance_wallets w where w.id=wallet_id and (public.has_role('admin') or (w.owner_kind='driver' and w.owner_user_id=auth.uid()) or (w.owner_kind='merchant' and exists(select 1 from public.stores s where s.id=w.store_id and s.owner_id=auth.uid())) or (w.owner_kind='fleet' and exists(select 1 from public.fleet_companies f where f.id=w.fleet_id and f.owner_user_id=auth.uid())))));
create policy fleet_driver_ledger_read on public.fleet_driver_ledger for select to authenticated using(public.has_role('admin') or driver_id=auth.uid() or exists(select 1 from public.fleet_companies f where f.id=fleet_id and f.owner_user_id=auth.uid()));
create policy loyalty_settings_read on public.loyalty_settings for select to authenticated using(true);
create policy reward_catalog_read on public.reward_catalog for select to authenticated using(active or public.has_role('admin'));
create policy reward_redemptions_read on public.reward_redemptions for select to authenticated using(user_id=auth.uid() or public.has_role('admin'));

create or replace function public.ensure_finance_wallet(p_owner_kind text,p_owner_user_id uuid default null,p_store_id uuid default null,p_fleet_id uuid default null)
returns public.finance_wallets
language plpgsql security definer set search_path=''
as $$
declare v public.finance_wallets%rowtype; s public.platform_commercial_settings%rowtype; limit_value numeric:=0; enforce boolean:=false;
begin
  select * into s from public.platform_commercial_settings where id='global';
  enforce:=coalesce(s.wallet_enforcement_enabled,false);
  if p_owner_kind='driver' then
    if p_owner_user_id is null then raise exception 'driver user required'; end if;
    limit_value:=coalesce(s.driver_debt_limit,0);
    insert into public.finance_wallets(owner_kind,owner_user_id,debt_limit,enforcement_enabled) values('driver',p_owner_user_id,limit_value,enforce) on conflict(owner_user_id) where owner_kind='driver' do update set debt_limit=excluded.debt_limit,enforcement_enabled=excluded.enforcement_enabled returning * into v;
  elsif p_owner_kind='merchant' then
    if p_store_id is null then raise exception 'store required'; end if;
    limit_value:=coalesce(s.merchant_debt_limit,0);
    insert into public.finance_wallets(owner_kind,store_id,debt_limit,enforcement_enabled) values('merchant',p_store_id,limit_value,enforce) on conflict(store_id) where owner_kind='merchant' do update set debt_limit=excluded.debt_limit,enforcement_enabled=excluded.enforcement_enabled returning * into v;
  elsif p_owner_kind='fleet' then
    if p_fleet_id is null then raise exception 'fleet required'; end if;
    select coalesce(f.debt_limit,s.fleet_debt_limit,0) into limit_value from public.fleet_companies f where f.id=p_fleet_id;
    insert into public.finance_wallets(owner_kind,fleet_id,debt_limit,enforcement_enabled) values('fleet',p_fleet_id,coalesce(limit_value,0),enforce) on conflict(fleet_id) where owner_kind='fleet' do update set debt_limit=excluded.debt_limit,enforcement_enabled=excluded.enforcement_enabled returning * into v;
  else raise exception 'invalid wallet kind'; end if;
  return v;
end $$;
revoke all on function public.ensure_finance_wallet(text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.ensure_finance_wallet(text,uuid,uuid,uuid) to service_role;

create or replace function public.post_finance_entry(p_wallet_id uuid,p_amount numeric,p_entry_type text,p_order_id uuid default null,p_memo text default null,p_created_by uuid default null)
returns public.finance_ledger
language plpgsql security definer set search_path=''
as $$
declare e public.finance_ledger%rowtype;
begin
 if p_amount=0 then raise exception 'zero amount not allowed'; end if;
 insert into public.finance_ledger(wallet_id,order_id,entry_type,amount,memo,created_by) values(p_wallet_id,p_order_id,p_entry_type,round(p_amount,2),p_memo,p_created_by) returning * into e;
 update public.finance_wallets set balance=round(balance+p_amount,2),updated_at=now() where id=p_wallet_id;
 return e;
exception when unique_violation then
 select * into e from public.finance_ledger where wallet_id=p_wallet_id and order_id=p_order_id and entry_type=p_entry_type order by created_at desc limit 1;
 return e;
end $$;
revoke all on function public.post_finance_entry(uuid,numeric,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.post_finance_entry(uuid,numeric,text,uuid,text,uuid) to service_role;

create or replace function public.finance_wallet_blocked(p_wallet_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(w.enforcement_enabled and w.debt_limit>0 and w.balance<=(-w.debt_limit),false) from public.finance_wallets w where w.id=p_wallet_id
$$;
revoke all on function public.finance_wallet_blocked(uuid) from public,anon,authenticated;
grant execute on function public.finance_wallet_blocked(uuid) to service_role;

create or replace function public.admin_create_fleet_company(p_name text,p_owner_user_id uuid,p_driver_commission_percent numeric default 0,p_platform_commission_percent numeric default null,p_debt_limit numeric default null)
returns public.fleet_companies language plpgsql security definer set search_path=''
as $$ declare v public.fleet_companies%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if not exists(select 1 from auth.users where id=p_owner_user_id) then raise exception 'Owner user not found'; end if;
 insert into public.fleet_companies(name,owner_user_id,driver_commission_percent,platform_commission_percent,debt_limit,created_by) values(trim(p_name),p_owner_user_id,coalesce(p_driver_commission_percent,0),p_platform_commission_percent,p_debt_limit,auth.uid()) returning * into v;
 perform public.ensure_finance_wallet('fleet',null,null,v.id);
 return v;
end $$;
revoke all on function public.admin_create_fleet_company(text,uuid,numeric,numeric,numeric) from public,anon;
grant execute on function public.admin_create_fleet_company(text,uuid,numeric,numeric,numeric) to authenticated;

create or replace function public.admin_set_fleet_driver(p_fleet_id uuid,p_driver_id uuid,p_active boolean,p_commission_percent numeric default null)
returns boolean language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if not exists(select 1 from public.user_roles where user_id=p_driver_id and role='driver') then raise exception 'User is not an approved driver'; end if;
 if p_active then
   update public.fleet_drivers set active=false,updated_at=now() where driver_id=p_driver_id and fleet_id<>p_fleet_id and active;
   insert into public.fleet_drivers(fleet_id,driver_id,commission_percent,active) values(p_fleet_id,p_driver_id,p_commission_percent,true) on conflict(fleet_id,driver_id) do update set commission_percent=excluded.commission_percent,active=true,updated_at=now();
 else update public.fleet_drivers set active=false,updated_at=now() where fleet_id=p_fleet_id and driver_id=p_driver_id; end if;
 return true;
end $$;
revoke all on function public.admin_set_fleet_driver(uuid,uuid,boolean,numeric) from public,anon;
grant execute on function public.admin_set_fleet_driver(uuid,uuid,boolean,numeric) to authenticated;

create or replace function public.admin_post_wallet_adjustment(p_wallet_id uuid,p_amount numeric,p_note text)
returns public.finance_ledger language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_amount=0 then raise exception 'Amount cannot be zero'; end if;
 return public.post_finance_entry(p_wallet_id,p_amount,case when p_amount>0 then 'topup' else 'admin_adjustment' end,null,coalesce(nullif(trim(p_note),''),'تعديل إداري'),auth.uid());
end $$;
revoke all on function public.admin_post_wallet_adjustment(uuid,numeric,text) from public,anon;
grant execute on function public.admin_post_wallet_adjustment(uuid,numeric,text) to authenticated;

create or replace function public.get_my_finance_wallets()
returns table(wallet_id uuid,owner_kind text,owner_label text,balance numeric,debt_limit numeric,enforcement_enabled boolean,blocked boolean)
language sql stable security definer set search_path='' as $$
 select w.id,w.owner_kind,
  case when w.owner_kind='driver' then 'محفظة المندوب' when w.owner_kind='merchant' then coalesce((select s.name from public.stores s where s.id=w.store_id),'محفظة التاجر') else coalesce((select f.name from public.fleet_companies f where f.id=w.fleet_id),'محفظة الشركة') end,
  w.balance,w.debt_limit,w.enforcement_enabled,(w.enforcement_enabled and w.debt_limit>0 and w.balance<=(-w.debt_limit))
 from public.finance_wallets w
 where (w.owner_kind='driver' and w.owner_user_id=auth.uid())
    or (w.owner_kind='merchant' and exists(select 1 from public.stores s where s.id=w.store_id and s.owner_id=auth.uid()))
    or (w.owner_kind='fleet' and exists(select 1 from public.fleet_companies f where f.id=w.fleet_id and f.owner_user_id=auth.uid()))
 order by w.owner_kind,w.updated_at desc
$$;
revoke all on function public.get_my_finance_wallets() from public,anon;
grant execute on function public.get_my_finance_wallets() to authenticated;

create or replace function public.get_driver_quality_snapshot(p_driver_id uuid)
returns table(avg_rating numeric,ratings_count bigint,delivered_30d bigint)
language plpgsql stable security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'not authenticated'; end if;
 if auth.uid()<>p_driver_id and not public.has_role('admin') and not exists(select 1 from public.fleet_drivers fd join public.fleet_companies f on f.id=fd.fleet_id where fd.driver_id=p_driver_id and fd.active and f.owner_user_id=auth.uid()) then raise exception 'not authorized'; end if;
 return query
 with last100 as (select rating from public.driver_reviews where driver_id=p_driver_id order by created_at desc limit 100)
 select coalesce(round(avg(rating)::numeric,2),0),count(*)::bigint,(select count(*) from public.orders where driver_id=p_driver_id and status='delivered' and updated_at>=now()-interval '30 days')::bigint from last100;
end $$;
revoke all on function public.get_driver_quality_snapshot(uuid) from public,anon;
grant execute on function public.get_driver_quality_snapshot(uuid) to authenticated;

create or replace function public.admin_update_loyalty_settings(p_customer_points_per_10 numeric,p_driver_points_per_delivery integer,p_merchant_points_per_order integer,p_referral_points integer,p_enabled boolean)
returns public.loyalty_settings language plpgsql security definer set search_path=''
as $$ declare v public.loyalty_settings%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_customer_points_per_10<0 or p_driver_points_per_delivery<0 or p_merchant_points_per_order<0 or p_referral_points<0 then raise exception 'Invalid points settings'; end if;
 update public.loyalty_settings set customer_points_per_10=p_customer_points_per_10,driver_points_per_delivery=p_driver_points_per_delivery,merchant_points_per_delivered_order=p_merchant_points_per_order,referral_points=p_referral_points,rewards_enabled=p_enabled,updated_at=now(),updated_by=auth.uid() where id='global' returning * into v;
 return v;
end $$;
revoke all on function public.admin_update_loyalty_settings(numeric,integer,integer,integer,boolean) from public,anon;
grant execute on function public.admin_update_loyalty_settings(numeric,integer,integer,integer,boolean) to authenticated;

create or replace function public.redeem_reward(p_reward_id uuid)
returns public.reward_redemptions language plpgsql security definer set search_path=''
as $$ declare me uuid:=auth.uid(); r public.reward_catalog%rowtype; w public.reward_wallets%rowtype; role_ok boolean:=false; redemption public.reward_redemptions%rowtype; begin
 if me is null then raise exception 'not authenticated'; end if;
 select * into r from public.reward_catalog where id=p_reward_id and active=true for update;
 if not found then raise exception 'reward unavailable'; end if;
 role_ok:=r.target_role='all' or exists(select 1 from public.user_roles ur where ur.user_id=me and ur.role::text=r.target_role);
 if not role_ok then raise exception 'reward not available for your role'; end if;
 w:=public.ensure_reward_wallet(me);
 if w.points<r.points_cost then raise exception 'not enough points'; end if;
 update public.reward_wallets set points=points-r.points_cost,updated_at=now() where user_id=me;
 insert into public.reward_events(user_id,points_delta,source,note) values(me,-r.points_cost,'reward_redemption','استبدال: '||r.title);
 insert into public.reward_redemptions(user_id,reward_id,points_spent,status,expires_at) values(me,r.id,r.points_cost,'available',now()+interval '90 days') returning * into redemption;
 return redemption;
end $$;
revoke all on function public.redeem_reward(uuid) from public,anon;
grant execute on function public.redeem_reward(uuid) to authenticated;
