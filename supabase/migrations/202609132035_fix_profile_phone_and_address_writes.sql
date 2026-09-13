-- Keep legacy accounts usable and make self-owned addresses independent of operational roles.
update public.profiles p
set phone = coalesce(
  nullif(trim(u.raw_user_meta_data->>'phone'), ''),
  case
    when u.email ~ '^u_20(10|11|12|15)[0-9]{8}@talabak\.internal\.net$'
      then '+' || substring(u.email from '^u_([0-9]+)@')
    when u.email ~ '^u_0(10|11|12|15)[0-9]{8}@talabak\.internal\.net$'
      then '+20' || substring(substring(u.email from '^u_([0-9]+)@') from 2)
    else null
  end
), updated_at = now()
from auth.users u
where p.id = u.id
  and (p.phone is null or trim(p.phone) = '');

drop policy if exists addresses_customer_self on public.addresses;
create policy addresses_self_read on public.addresses for select to authenticated using (user_id=(select auth.uid()));
create policy addresses_self_insert on public.addresses for insert to authenticated with check (user_id=(select auth.uid()));
create policy addresses_self_update on public.addresses for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy addresses_self_delete on public.addresses for delete to authenticated using (user_id=(select auth.uid()));

create or replace function public.save_my_address(p_id uuid,p_label text,p_address_line text,p_latitude double precision default null,p_longitude double precision default null,p_is_default boolean default false)
returns public.addresses language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_row public.addresses;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  if length(trim(coalesce(p_address_line,'')))<5 then raise exception 'اكتب عنوانًا واضحًا'; end if;
  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then raise exception 'إحداثيات الموقع غير صحيحة'; end if;
  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then raise exception 'إحداثيات الموقع غير صحيحة'; end if;
  if p_is_default then update public.addresses set is_default=false where user_id=v_uid; end if;
  if p_id is null then
    insert into public.addresses(user_id,label,address_line,latitude,longitude,is_default)
    values(v_uid,coalesce(nullif(trim(p_label),''),'المنزل'),trim(p_address_line),p_latitude,p_longitude,p_is_default)
    returning * into v_row;
  else
    update public.addresses set label=coalesce(nullif(trim(p_label),''),'المنزل'),address_line=trim(p_address_line),latitude=p_latitude,longitude=p_longitude,is_default=p_is_default
    where id=p_id and user_id=v_uid returning * into v_row;
    if v_row.id is null then raise exception 'العنوان غير موجود أو غير مسموح بتعديله'; end if;
  end if;
  return v_row;
end $$;
revoke all on function public.save_my_address(uuid,text,text,double precision,double precision,boolean) from public,anon;
grant execute on function public.save_my_address(uuid,text,text,double precision,double precision,boolean) to authenticated;

create or replace function public.delete_my_address(p_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_count integer;
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول أولًا'; end if;
  delete from public.addresses where id=p_id and user_id=v_uid;
  get diagnostics v_count=row_count;
  return v_count>0;
end $$;
revoke all on function public.delete_my_address(uuid) from public,anon;
grant execute on function public.delete_my_address(uuid) to authenticated;
