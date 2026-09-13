create or replace function public.update_my_profile_name(p_full_name text)
returns public.profiles
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.profiles;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  if length(trim(coalesce(p_full_name,'')))<2 then raise exception 'اكتب الاسم بشكل صحيح'; end if;
  update public.profiles set full_name=trim(p_full_name),updated_at=now() where id=v_uid returning * into v_row;
  if v_row.id is null then raise exception 'تعذر العثور على بيانات الحساب'; end if;
  return v_row;
end $$;
revoke all on function public.update_my_profile_name(text) from public,anon;
grant execute on function public.update_my_profile_name(text) to authenticated;
