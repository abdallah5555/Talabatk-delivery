create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null unique check (placement_key in ('home_top','home_feed','store_bottom')),
  title text not null,
  description text null,
  enabled boolean not null default false,
  provider text not null default 'direct' check (provider in ('direct','google','other')),
  platform text not null default 'all' check (platform in ('all','android','ios','web')),
  media_url text null,
  target_url text null,
  google_ad_unit_id text null,
  other_provider_config jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  starts_at timestamptz null,
  ends_at timestamptz null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id)
);
insert into public.ad_placements(placement_key,title,description,enabled,provider,platform,priority)
values
 ('home_top','إعلان أعلى الصفحة الرئيسية','بانر واحد واضح بعد الترحيب وقبل المتاجر.',false,'direct','all',30),
 ('home_feed','إعلان داخل الصفحة الرئيسية','إعلان واحد بين مجموعات المحتوى لتجنب الإزعاج.',false,'direct','all',20),
 ('store_bottom','إعلان أسفل صفحة المتجر','إعلان بعد المنيو وقبل نهاية الصفحة، بعيد عن زر الدفع.',false,'direct','all',10)
on conflict(placement_key) do nothing;
alter table public.ad_placements enable row level security;
revoke all on public.ad_placements from anon, authenticated;
grant select on public.ad_placements to authenticated, anon;
create policy ad_placements_public_read_active on public.ad_placements for select to anon, authenticated using (enabled=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
create policy ad_placements_admin_read on public.ad_placements for select to authenticated using (public.has_role('admin'));
create or replace function public.get_active_ad_placements(p_platform text default 'web') returns setof public.ad_placements language sql stable security definer set search_path='' as $$
 select a.* from public.ad_placements a where a.enabled=true and (a.platform='all' or a.platform=p_platform) and (a.starts_at is null or a.starts_at<=now()) and (a.ends_at is null or a.ends_at>now()) order by a.priority desc,a.placement_key;
$$;
revoke all on function public.get_active_ad_placements(text) from public;
grant execute on function public.get_active_ad_placements(text) to anon, authenticated;
create or replace function public.admin_update_ad_placement(p_placement_key text,p_enabled boolean,p_provider text,p_platform text,p_media_url text,p_target_url text,p_google_ad_unit_id text,p_priority integer default 0,p_starts_at timestamptz default null,p_ends_at timestamptz default null,p_other_provider_config jsonb default '{}'::jsonb) returns public.ad_placements language plpgsql security definer set search_path='' as $$
declare v public.ad_placements%rowtype; begin
 if auth.uid() is null or not public.has_role('admin') then raise exception 'Admin authorization required'; end if;
 if p_provider not in ('direct','google','other') then raise exception 'Invalid ad provider'; end if;
 if p_platform not in ('all','android','ios','web') then raise exception 'Invalid platform'; end if;
 if p_starts_at is not null and p_ends_at is not null and p_ends_at<=p_starts_at then raise exception 'Invalid campaign period'; end if;
 update public.ad_placements set enabled=p_enabled,provider=p_provider,platform=p_platform,media_url=nullif(trim(coalesce(p_media_url,'')),''),target_url=nullif(trim(coalesce(p_target_url,'')),''),google_ad_unit_id=nullif(trim(coalesce(p_google_ad_unit_id,'')),''),other_provider_config=coalesce(p_other_provider_config,'{}'::jsonb),priority=greatest(-1000,least(1000,p_priority)),starts_at=p_starts_at,ends_at=p_ends_at,updated_at=now(),updated_by=auth.uid() where placement_key=p_placement_key returning * into v;
 if not found then raise exception 'Unknown ad placement'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'ad_placement_updated','ad_placement',p_placement_key,jsonb_build_object('enabled',p_enabled,'provider',p_provider,'platform',p_platform,'priority',p_priority));
 return v; end $$;
revoke all on function public.admin_update_ad_placement(text,boolean,text,text,text,text,text,integer,timestamptz,timestamptz,jsonb) from public,anon;
grant execute on function public.admin_update_ad_placement(text,boolean,text,text,text,text,text,integer,timestamptz,timestamptz,jsonb) to authenticated;
