create or replace function public.get_my_profile_summary()
returns table(id uuid, full_name text, phone text, avatar_url text)
language sql
security definer
set search_path = ''
stable
as $$
  select p.id, p.full_name, p.phone, p.avatar_url
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_profile_summary() from public;
revoke all on function public.get_my_profile_summary() from anon;
grant execute on function public.get_my_profile_summary() to authenticated;
