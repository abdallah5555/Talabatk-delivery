alter table public.merchant_applications
  add column if not exists logo_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.driver_applications
  add column if not exists transport_mode text,
  add column if not exists motorcycle_type text,
  add column if not exists profile_photo_url text,
  add column if not exists driving_license_front_path text,
  add column if not exists driving_license_back_path text,
  add column if not exists vehicle_license_front_path text,
  add column if not exists vehicle_license_back_path text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='driver_applications_transport_mode_check') then
    alter table public.driver_applications add constraint driver_applications_transport_mode_check
      check (transport_mode is null or transport_mode in ('motorcycle','bicycle')) not valid;
  end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('public-media','public-media',true,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('onboarding-documents','onboarding-documents',false,6291456,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists public_media_owner_insert on storage.objects;
create policy public_media_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='public-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists public_media_owner_update on storage.objects;
create policy public_media_owner_update on storage.objects for update to authenticated
using (bucket_id='public-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='public-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists public_media_owner_delete on storage.objects;
create policy public_media_owner_delete on storage.objects for delete to authenticated
using (bucket_id='public-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists onboarding_docs_owner_insert on storage.objects;
create policy onboarding_docs_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='onboarding-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists onboarding_docs_owner_read on storage.objects;
create policy onboarding_docs_owner_read on storage.objects for select to authenticated
using (bucket_id='onboarding-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select public.has_role('admin'::public.app_role))));
drop policy if exists onboarding_docs_owner_delete on storage.objects;
create policy onboarding_docs_owner_delete on storage.objects for delete to authenticated
using (bucket_id='onboarding-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.admin_set_merchant_application(p_id uuid,p_status text)
returns public.merchant_applications language plpgsql security definer set search_path=''
as $$
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
      insert into public.stores(owner_id,name,category,address,phone,description,image_url,is_open,prep_minutes,delivery_fee,min_order,rating)
      values(v.applicant_id,v.business_name,v.category,v.address,null,'متجر معتمد على طلباتك',v.logo_url,true,25,15,0,5)
      returning id into v_store_id;
    else
      update public.stores set image_url=coalesce(v.logo_url,image_url),address=v.address,category=v.category where id=v_store_id;
    end if;
    insert into public.store_private_contacts(store_id,phone,updated_at)
    values(v_store_id,v.phone,now()) on conflict(store_id) do update set phone=excluded.phone,updated_at=excluded.updated_at;
  elsif p_status='rejected' then
    delete from public.user_roles where user_id=v.applicant_id and role='merchant';
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'merchant_application_'||p_status,'merchant_application',p_id,jsonb_build_object('applicant_id',v.applicant_id));
  return v;
end;$$;
revoke all on function public.admin_set_merchant_application(uuid,text) from public,anon;
grant execute on function public.admin_set_merchant_application(uuid,text) to authenticated;

create or replace function public.admin_set_driver_application(p_id uuid,p_status text)
returns public.driver_applications language plpgsql security definer set search_path=''
as $$
declare v public.driver_applications%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  update public.driver_applications set status=p_status where id=p_id returning * into v;
  if not found then raise exception 'Application not found'; end if;
  if p_status='approved' then
    insert into public.user_roles(user_id,role) values(v.applicant_id,'driver') on conflict(user_id,role) do nothing;
    insert into public.driver_status(user_id,is_online) values(v.applicant_id,false) on conflict(user_id) do nothing;
    update public.profiles set avatar_url=coalesce(v.profile_photo_url,avatar_url),updated_at=now() where id=v.applicant_id;
  elsif p_status='rejected' then
    delete from public.user_roles where user_id=v.applicant_id and role='driver';
    update public.driver_status set is_online=false where user_id=v.applicant_id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'driver_application_'||p_status,'driver_application',p_id,jsonb_build_object('applicant_id',v.applicant_id,'transport_mode',v.transport_mode));
  return v;
end;$$;
revoke all on function public.admin_set_driver_application(uuid,text) from public,anon;
grant execute on function public.admin_set_driver_application(uuid,text) to authenticated;
