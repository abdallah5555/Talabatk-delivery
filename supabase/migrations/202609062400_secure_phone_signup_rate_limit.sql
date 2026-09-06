create table if not exists public.signup_rate_limits(
  key_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.signup_rate_limits enable row level security;
revoke all on table public.signup_rate_limits from public,anon,authenticated;
grant all on table public.signup_rate_limits to service_role;

create or replace function public.consume_signup_rate_limit(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare v_attempts int; v_start timestamptz;
begin
  if current_user not in ('service_role','postgres','supabase_admin') then raise exception 'Service role only'; end if;
  insert into public.signup_rate_limits(key_hash,window_started_at,attempts,updated_at)
  values(p_key_hash,now(),1,now())
  on conflict(key_hash) do update set
    attempts=case when public.signup_rate_limits.window_started_at < now()-interval '1 hour' then 1 else public.signup_rate_limits.attempts+1 end,
    window_started_at=case when public.signup_rate_limits.window_started_at < now()-interval '1 hour' then now() else public.signup_rate_limits.window_started_at end,
    updated_at=now()
  returning attempts,window_started_at into v_attempts,v_start;
  return v_attempts<=5;
end;
$$;
revoke all on function public.consume_signup_rate_limit(text) from public,anon,authenticated;
grant execute on function public.consume_signup_rate_limit(text) to service_role;
