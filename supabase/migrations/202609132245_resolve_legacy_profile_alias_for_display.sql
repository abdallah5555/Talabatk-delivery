create or replace function public.get_my_profile_summary()
returns table(id uuid, full_name text, phone text, avatar_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_phone_digits text;
  v_full_name text;
  v_phone text;
  v_avatar_url text;
  v_alias_name text;
  v_alias_phone text;
  v_alias_avatar text;
begin
  if v_uid is null then
    return;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  if v_email ~ '^u_20(10|11|12|15)[0-9]{8}@talabak\.internal\.net$' then
    v_phone_digits := substring(v_email from '^u_([0-9]+)@');
  elsif v_email ~ '^20(10|11|12|15)[0-9]{8}@talabak\.app$' then
    v_phone_digits := substring(v_email from '^([0-9]+)@');
  elsif v_email ~ '^0(10|11|12|15)[0-9]{8}@talabak\.app$' then
    v_phone_digits := '20' || substring(v_email from '^0([0-9]+)@');
  end if;

  select p.full_name, p.phone, p.avatar_url
  into v_full_name, v_phone, v_avatar_url
  from public.profiles p
  where p.id = v_uid;

  if nullif(trim(coalesce(v_full_name,'')),'') is null and v_phone_digits is not null then
    select p.full_name, p.phone, p.avatar_url
    into v_alias_name, v_alias_phone, v_alias_avatar
    from public.profiles p
    where regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = v_phone_digits
      and nullif(trim(coalesce(p.full_name,'')),'') is not null
    order by (p.id = v_uid) desc, p.updated_at desc nulls last
    limit 1;
  end if;

  return query
  select
    v_uid,
    coalesce(nullif(trim(coalesce(v_full_name,'')),''), nullif(trim(coalesce(v_alias_name,'')),'')),
    coalesce(nullif(trim(coalesce(v_phone,'')),''), case when v_phone_digits is not null then '+' || v_phone_digits else null end, nullif(trim(coalesce(v_alias_phone,'')),'')),
    coalesce(v_avatar_url, v_alias_avatar);
end;
$$;

revoke all on function public.get_my_profile_summary() from public;
grant execute on function public.get_my_profile_summary() to authenticated;
