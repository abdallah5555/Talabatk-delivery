create or replace function public.admin_set_merchant_application(p_id uuid, p_status text)
returns public.merchant_applications
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v public.merchant_applications%rowtype;
  v_store_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;

  update public.merchant_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;

  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'merchant') on conflict(user_id,role) do nothing;
    select id into v_store_id from public.stores where owner_id=v.applicant_id and name=v.business_name limit 1;
    if v_store_id is null then
      insert into public.stores(owner_id,name,category,address,latitude,longitude,phone,description,image_url,is_open,prep_minutes,delivery_fee,min_order,rating)
      values(v.applicant_id,v.business_name,v.category,v.address,v.latitude,v.longitude,null,'متجر معتمد على طلباتك',v.logo_url,false,25,15,0,5)
      returning id into v_store_id;
    else
      update public.stores set image_url=coalesce(v.logo_url,image_url),address=v.address,category=v.category,latitude=v.latitude,longitude=v.longitude,updated_at=now() where id=v_store_id;
    end if;
    insert into public.store_private_contacts(store_id,phone,updated_at)
    values(v_store_id,v.phone,now()) on conflict(store_id) do update set phone=excluded.phone,updated_at=excluded.updated_at;
  elsif p_status='rejected' then
    delete from public.user_roles where user_id=v.applicant_id and role='merchant';
  end if;

  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'merchant_application_'||p_status,'merchant_application',p_id,jsonb_build_object('applicant_id',v.applicant_id));
  return v;
end;
$function$;

revoke insert, delete, truncate on public.stores from authenticated;
revoke update on public.stores from authenticated;
grant update(name,category,description,image_url,address,latitude,longitude,delivery_fee,is_open,prep_minutes)
  on public.stores to authenticated;
