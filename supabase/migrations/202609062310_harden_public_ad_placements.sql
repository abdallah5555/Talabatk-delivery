drop function if exists public.get_active_ad_placements(text);

create function public.get_active_ad_placements(p_platform text default 'web')
returns table(
  id uuid,
  placement_key text,
  title text,
  description text,
  enabled boolean,
  provider text,
  platform text,
  media_url text,
  target_url text,
  google_ad_unit_id text,
  priority integer,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.placement_key,
    a.title,
    a.description,
    a.enabled,
    a.provider,
    a.platform,
    a.media_url,
    a.target_url,
    a.google_ad_unit_id,
    a.priority,
    a.starts_at,
    a.ends_at
  from public.ad_placements a
  where a.enabled = true
    and (a.platform = 'all' or a.platform = p_platform)
    and (a.starts_at is null or a.starts_at <= now())
    and (a.ends_at is null or a.ends_at > now())
  order by a.priority desc, a.placement_key;
$$;

revoke all on function public.get_active_ad_placements(text) from public;
grant execute on function public.get_active_ad_placements(text) to anon, authenticated, service_role;

revoke select on table public.ad_placements from anon, authenticated;
grant select (
  id, placement_key, title, description, enabled, provider, platform,
  media_url, target_url, google_ad_unit_id, priority, starts_at, ends_at, updated_at
) on table public.ad_placements to anon, authenticated;
