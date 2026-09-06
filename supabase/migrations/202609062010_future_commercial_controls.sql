-- Future commercial controls. Current defaults intentionally keep Talabatk free.
create table if not exists public.platform_commercial_settings (
  id text primary key default 'global' check (id='global'),
  merchant_subscription_required boolean not null default false,
  merchant_default_monthly_price numeric(12,2) not null default 0 check (merchant_default_monthly_price >= 0),
  cashier_subscription_required boolean not null default false,
  cashier_default_monthly_price numeric(12,2) not null default 0 check (cashier_default_monthly_price >= 0),
  driver_platform_commission_percent numeric(5,2) not null default 0 check (driver_platform_commission_percent between 0 and 100),
  updated_at timestamptz not null default now(), updated_by uuid null references auth.users(id)
);
insert into public.platform_commercial_settings(id) values('global') on conflict(id) do nothing;

create table if not exists public.store_service_access (
  store_id uuid primary key references public.stores(id) on delete cascade,
  merchant_service_enabled boolean not null default true,
  merchant_plan text not null default 'free',
  merchant_monthly_price numeric(12,2) not null default 0 check (merchant_monthly_price >= 0),
  merchant_subscription_expires_at timestamptz null,
  cashier_enabled boolean not null default true,
  cashier_monthly_price numeric(12,2) not null default 0 check (cashier_monthly_price >= 0),
  cashier_subscription_expires_at timestamptz null,
  updated_at timestamptz not null default now(), updated_by uuid null references auth.users(id)
);
insert into public.store_service_access(store_id) select id from public.stores on conflict(store_id) do nothing;
alter table public.platform_commercial_settings enable row level security;
alter table public.store_service_access enable row level security;
revoke all on public.platform_commercial_settings from anon, authenticated;
revoke all on public.store_service_access from anon, authenticated;
grant select on public.platform_commercial_settings, public.store_service_access to authenticated;
create policy commercial_settings_admin_read on public.platform_commercial_settings for select to authenticated using (public.has_role('admin'));
create policy store_service_access_admin_read on public.store_service_access for select to authenticated using (public.has_role('admin'));
create policy store_service_access_owner_read on public.store_service_access for select to authenticated using (exists(select 1 from public.stores s where s.id=store_id and s.owner_id=auth.uid()));

create or replace function public.admin_update_commercial_settings(p_merchant_subscription_required boolean,p_merchant_default_monthly_price numeric,p_cashier_subscription_required boolean,p_cashier_default_monthly_price numeric,p_driver_platform_commission_percent numeric) returns public.platform_commercial_settings language plpgsql security definer set search_path='' as $$
declare v public.platform_commercial_settings%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_merchant_default_monthly_price<0 or p_cashier_default_monthly_price<0 or p_driver_platform_commission_percent<0 or p_driver_platform_commission_percent>100 then raise exception 'Invalid commercial settings'; end if;
 insert into public.platform_commercial_settings(id,merchant_subscription_required,merchant_default_monthly_price,cashier_subscription_required,cashier_default_monthly_price,driver_platform_commission_percent,updated_at,updated_by) values('global',p_merchant_subscription_required,p_merchant_default_monthly_price,p_cashier_subscription_required,p_cashier_default_monthly_price,p_driver_platform_commission_percent,now(),auth.uid()) on conflict(id) do update set merchant_subscription_required=excluded.merchant_subscription_required,merchant_default_monthly_price=excluded.merchant_default_monthly_price,cashier_subscription_required=excluded.cashier_subscription_required,cashier_default_monthly_price=excluded.cashier_default_monthly_price,driver_platform_commission_percent=excluded.driver_platform_commission_percent,updated_at=now(),updated_by=auth.uid() returning * into v;
 return v; end $$;

create or replace function public.admin_update_store_service_access(p_store_id uuid,p_merchant_service_enabled boolean,p_merchant_plan text,p_merchant_monthly_price numeric,p_merchant_subscription_expires_at timestamptz,p_cashier_enabled boolean,p_cashier_monthly_price numeric,p_cashier_subscription_expires_at timestamptz) returns public.store_service_access language plpgsql security definer set search_path='' as $$
declare v public.store_service_access%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if not exists(select 1 from public.stores where id=p_store_id) then raise exception 'Store not found'; end if;
 if p_merchant_monthly_price<0 or p_cashier_monthly_price<0 then raise exception 'Invalid price'; end if;
 insert into public.store_service_access(store_id,merchant_service_enabled,merchant_plan,merchant_monthly_price,merchant_subscription_expires_at,cashier_enabled,cashier_monthly_price,cashier_subscription_expires_at,updated_at,updated_by) values(p_store_id,p_merchant_service_enabled,coalesce(nullif(trim(p_merchant_plan),''),'free'),p_merchant_monthly_price,p_merchant_subscription_expires_at,p_cashier_enabled,p_cashier_monthly_price,p_cashier_subscription_expires_at,now(),auth.uid()) on conflict(store_id) do update set merchant_service_enabled=excluded.merchant_service_enabled,merchant_plan=excluded.merchant_plan,merchant_monthly_price=excluded.merchant_monthly_price,merchant_subscription_expires_at=excluded.merchant_subscription_expires_at,cashier_enabled=excluded.cashier_enabled,cashier_monthly_price=excluded.cashier_monthly_price,cashier_subscription_expires_at=excluded.cashier_subscription_expires_at,updated_at=now(),updated_by=auth.uid() returning * into v;
 return v; end $$;

grant execute on function public.admin_update_commercial_settings(boolean,numeric,boolean,numeric,numeric), public.admin_update_store_service_access(uuid,boolean,text,numeric,timestamptz,boolean,numeric,timestamptz) to authenticated;
revoke execute on function public.admin_update_commercial_settings(boolean,numeric,boolean,numeric,numeric), public.admin_update_store_service_access(uuid,boolean,text,numeric,timestamptz,boolean,numeric,timestamptz) from anon, public;

create or replace function public.ensure_store_service_access() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.store_service_access(store_id) values(new.id) on conflict(store_id) do nothing; return new; end $$;
revoke all on function public.ensure_store_service_access() from public, anon, authenticated;
drop trigger if exists trg_store_service_access on public.stores;
create trigger trg_store_service_access after insert on public.stores for each row execute function public.ensure_store_service_access();

create or replace function public.get_my_store_service_access(p_store_id uuid) returns table(merchant_service_enabled boolean,merchant_plan text,merchant_monthly_price numeric,merchant_subscription_expires_at timestamptz,cashier_enabled boolean,cashier_monthly_price numeric,cashier_subscription_expires_at timestamptz,merchant_subscription_required boolean,cashier_subscription_required boolean,driver_platform_commission_percent numeric) language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null or not exists(select 1 from public.stores s where s.id=p_store_id and s.owner_id=auth.uid()) then raise exception 'Merchant authorization required'; end if;
 return query select a.merchant_service_enabled,a.merchant_plan,a.merchant_monthly_price,a.merchant_subscription_expires_at,a.cashier_enabled,a.cashier_monthly_price,a.cashier_subscription_expires_at,c.merchant_subscription_required,c.cashier_subscription_required,c.driver_platform_commission_percent from public.store_service_access a cross join public.platform_commercial_settings c where a.store_id=p_store_id and c.id='global'; end $$;
grant execute on function public.get_my_store_service_access(uuid) to authenticated; revoke execute on function public.get_my_store_service_access(uuid) from anon, public;
