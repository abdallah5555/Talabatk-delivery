create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_registration_kind text := coalesce(nullif(new.raw_user_meta_data->>'registration_kind',''),'customer');
begin
  insert into public.profiles(id,full_name,phone,is_active)
  values(
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'مستخدم طلباتك'),
    nullif(coalesce(new.phone,new.raw_user_meta_data->>'phone'),''),
    true
  )
  on conflict(id) do update set
    full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name),
    phone=coalesce(excluded.phone,public.profiles.phone),
    is_active=true,
    updated_at=now();

  if v_registration_kind = 'customer' then
    insert into public.user_roles(user_id,role)
    values(new.id,'customer')
    on conflict(user_id,role) do nothing;
  elsif v_registration_kind not in ('merchant','driver') then
    raise exception 'Invalid registration kind';
  end if;

  return new;
end;
$function$;
