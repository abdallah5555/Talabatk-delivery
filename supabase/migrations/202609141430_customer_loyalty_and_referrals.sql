create table if not exists public.reward_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0 check(points>=0),
  lifetime_points integer not null default 0 check(lifetime_points>=0),
  referral_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  points_delta integer not null,
  source text not null check(source in ('order_delivered','referral_referrer','referral_referred','admin_adjustment')),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists reward_events_delivered_order_unique on public.reward_events(order_id) where source='order_delivered' and order_id is not null;
create index if not exists reward_events_user_created_idx on public.reward_events(user_id,created_at desc);

create table if not exists public.referral_claims (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  claimed_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check(referred_user_id<>referrer_user_id)
);
create index if not exists referral_claims_referrer_idx on public.referral_claims(referrer_user_id);

alter table public.reward_wallets enable row level security;
alter table public.reward_events enable row level security;
alter table public.referral_claims enable row level security;

drop policy if exists reward_wallet_self_read on public.reward_wallets;
create policy reward_wallet_self_read on public.reward_wallets for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists reward_events_self_read on public.reward_events;
create policy reward_events_self_read on public.reward_events for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists referral_claim_self_read on public.referral_claims;
create policy referral_claim_self_read on public.referral_claims for select to authenticated using(referred_user_id=(select auth.uid()) or referrer_user_id=(select auth.uid()));

revoke all on public.reward_wallets from anon;
revoke all on public.reward_events from anon;
revoke all on public.referral_claims from anon;
grant select on public.reward_wallets to authenticated;
grant select on public.reward_events to authenticated;
grant select on public.referral_claims to authenticated;

create or replace function public.ensure_reward_wallet(p_user_id uuid)
returns public.reward_wallets
language plpgsql
security definer
set search_path=''
as $$
declare result public.reward_wallets;
begin
  if p_user_id is null then raise exception 'missing user'; end if;
  insert into public.reward_wallets(user_id,referral_code)
  values(p_user_id,upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)))
  on conflict(user_id) do nothing;
  select * into result from public.reward_wallets where user_id=p_user_id;
  return result;
end;
$$;
revoke all on function public.ensure_reward_wallet(uuid) from public,anon,authenticated;
grant execute on function public.ensure_reward_wallet(uuid) to service_role;

create or replace function public.get_my_rewards()
returns table(points integer,lifetime_points integer,referral_code text,referrals_count bigint)
language plpgsql
security definer
set search_path=''
as $$
declare me uuid:=auth.uid(); wallet public.reward_wallets;
begin
  if me is null then raise exception 'not authenticated'; end if;
  wallet:=public.ensure_reward_wallet(me);
  return query select wallet.points,wallet.lifetime_points,wallet.referral_code,(select count(*) from public.referral_claims r where r.referrer_user_id=me and r.rewarded_at is not null);
end;
$$;
revoke all on function public.get_my_rewards() from public,anon;
grant execute on function public.get_my_rewards() to authenticated;

create or replace function public.claim_referral_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare me uuid:=auth.uid(); referrer uuid; normalized text:=upper(trim(coalesce(p_code,'')));
begin
  if me is null then raise exception 'not authenticated'; end if;
  if normalized='' then raise exception 'invalid code'; end if;
  perform public.ensure_reward_wallet(me);
  select user_id into referrer from public.reward_wallets where referral_code=normalized;
  if referrer is null then raise exception 'invalid code'; end if;
  if referrer=me then raise exception 'cannot refer yourself'; end if;
  if exists(select 1 from public.orders where customer_id=me and status='delivered') then raise exception 'referral must be claimed before first delivered order'; end if;
  insert into public.referral_claims(referred_user_id,referrer_user_id,referral_code) values(me,referrer,normalized) on conflict(referred_user_id) do nothing;
  return found;
end;
$$;
revoke all on function public.claim_referral_code(text) from public,anon;
grant execute on function public.claim_referral_code(text) to authenticated;

create or replace function public.award_order_rewards()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare earned integer; claim public.referral_claims;
begin
  if NEW.status='delivered' and (TG_OP='INSERT' or OLD.status is distinct from NEW.status) and NEW.customer_id is not null then
    perform public.ensure_reward_wallet(NEW.customer_id);
    earned:=greatest(1,floor(coalesce(NEW.total,0)/10)::integer);
    insert into public.reward_events(user_id,points_delta,source,order_id,note)
    values(NEW.customer_id,earned,'order_delivered',NEW.id,'نقاط طلب مكتمل')
    on conflict do nothing;
    if found then
      update public.reward_wallets set points=points+earned,lifetime_points=lifetime_points+earned,updated_at=now() where user_id=NEW.customer_id;
    end if;

    select * into claim from public.referral_claims where referred_user_id=NEW.customer_id and rewarded_at is null;
    if claim.referred_user_id is not null then
      perform public.ensure_reward_wallet(claim.referrer_user_id);
      insert into public.reward_events(user_id,points_delta,source,order_id,note) values(claim.referrer_user_id,50,'referral_referrer',NEW.id,'مكافأة دعوة صديق');
      insert into public.reward_events(user_id,points_delta,source,order_id,note) values(NEW.customer_id,50,'referral_referred',NEW.id,'مكافأة أول طلب بعد الدعوة');
      update public.reward_wallets set points=points+50,lifetime_points=lifetime_points+50,updated_at=now() where user_id in (claim.referrer_user_id,NEW.customer_id);
      update public.referral_claims set rewarded_at=now() where referred_user_id=NEW.customer_id and rewarded_at is null;
    end if;
  end if;
  return NEW;
end;
$$;
revoke all on function public.award_order_rewards() from public,anon,authenticated;
grant execute on function public.award_order_rewards() to service_role;

drop trigger if exists trg_award_order_rewards on public.orders;
create trigger trg_award_order_rewards after insert or update of status on public.orders for each row execute function public.award_order_rewards();
