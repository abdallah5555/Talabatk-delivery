-- Applied to project vriwhtuxagnbfxybjviz on 2026-09-06.
create or replace function public.admin_set_driver_application(p_id uuid, p_status text)
returns public.driver_applications language plpgsql security definer set search_path = '' as $$
declare v public.driver_applications%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  update public.driver_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'driver') on conflict(user_id,role) do nothing;
    insert into public.driver_status(user_id,is_online) values(v.applicant_id,false) on conflict(user_id) do nothing;
  elsif p_status='rejected' then
    delete from public.user_roles where user_id=v.applicant_id and role='driver';
    update public.driver_status set is_online=false where user_id=v.applicant_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'driver_application_'||p_status,'driver_application',p_id,jsonb_build_object('applicant_id',v.applicant_id));
  return v;
end;
$$;

create or replace function public.admin_set_merchant_application(p_id uuid, p_status text)
returns public.merchant_applications language plpgsql security definer set search_path = '' as $$
declare v public.merchant_applications%rowtype; v_store_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  update public.merchant_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'merchant') on conflict(user_id,role) do nothing;
    select id into v_store_id from public.stores where owner_id=v.applicant_id and name=v.business_name limit 1;
    if v_store_id is null then
      insert into public.stores(owner_id,name,category,address,phone,description,is_open,prep_minutes,delivery_fee,min_order,rating)
      values(v.applicant_id,v.business_name,v.category,v.address,null,'متجر جديد على طلباتك',true,25,15,0,5)
      returning id into v_store_id;
    end if;
    insert into public.store_private_contacts(store_id,phone,updated_at)
    values(v_store_id,v.phone,now())
    on conflict(store_id) do update set phone=excluded.phone,updated_at=excluded.updated_at;
  elsif p_status='rejected' then
    delete from public.user_roles where user_id=v.applicant_id and role='merchant';
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'merchant_application_'||p_status,'merchant_application',p_id,jsonb_build_object('applicant_id',v.applicant_id));
  return v;
end;
$$;

create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin only'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'User not found'; end if;
  if p_enabled then
    insert into public.user_roles(user_id,role) values(p_user_id,p_role) on conflict(user_id,role) do nothing;
    if p_role='driver' then insert into public.driver_status(user_id,is_online) values(p_user_id,false) on conflict(user_id) do nothing; end if;
  else
    if p_role='admin' and p_user_id=auth.uid() then raise exception 'لا يمكن إزالة دور الإدارة من الحساب الحالي'; end if;
    if p_role='admin' then
      select count(*) into v_count from public.user_roles ur join public.profiles p on p.id=ur.user_id where ur.role='admin' and p.is_active=true;
      if v_count<=1 then raise exception 'يجب أن يظل هناك مدير نشط واحد على الأقل'; end if;
    end if;
    delete from public.user_roles where user_id=p_user_id and role=p_role;
    if p_role='driver' then update public.driver_status set is_online=false where user_id=p_user_id; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when p_enabled then 'role_enabled' else 'role_disabled' end,'user',p_user_id,jsonb_build_object('role',p_role::text));
  return true;
end;
$$;

revoke all on function public.admin_set_driver_application(uuid,text) from public,anon;
revoke all on function public.admin_set_merchant_application(uuid,text) from public,anon;
revoke all on function public.admin_set_role(uuid,public.app_role,boolean) from public,anon;
grant execute on function public.admin_set_driver_application(uuid,text) to authenticated,service_role;
grant execute on function public.admin_set_merchant_application(uuid,text) to authenticated,service_role;
grant execute on function public.admin_set_role(uuid,public.app_role,boolean) to authenticated,service_role;
