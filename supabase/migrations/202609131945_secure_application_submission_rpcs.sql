drop function if exists public.submit_merchant_application(text,text,text,double precision,double precision,text,text,text,text,text);
create function public.submit_merchant_application(
  p_business_name text,
  p_category text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_logo_url text,
  p_national_id_front_path text,
  p_national_id_back_path text,
  p_commercial_registration_path text,
  p_tax_card_path text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_phone text;
  v_id uuid;
begin
  if v_user is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
  if public.has_role('merchant'::public.app_role) then raise exception 'دور التاجر مفعّل على الحساب بالفعل.'; end if;
  select p.phone into v_phone from public.profiles p where p.id=v_user and coalesce(p.is_active,true)=true;
  if v_phone is null or length(trim(v_phone))=0 then raise exception 'رقم الهاتف غير موجود في الحساب.'; end if;
  if exists(select 1 from public.merchant_applications a where a.applicant_id=v_user and a.status='pending') then raise exception 'عندك طلب تاجر قيد المراجعة بالفعل.'; end if;
  if length(trim(coalesce(p_business_name,'')))<2 or length(trim(coalesce(p_category,'')))<2 or length(trim(coalesce(p_address,'')))<5 then raise exception 'راجع اسم النشاط والتصنيف والعنوان.'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'موقع النشاط غير صالح.'; end if;
  if length(trim(coalesce(p_logo_url,'')))=0 then raise exception 'صورة النشاط مطلوبة.'; end if;
  if length(trim(coalesce(p_national_id_front_path,'')))=0 or length(trim(coalesce(p_national_id_back_path,'')))=0 or length(trim(coalesce(p_commercial_registration_path,'')))=0 then raise exception 'بطاقة الرقم القومي وش وظهر والسجل التجاري مطلوبة.'; end if;
  insert into public.merchant_applications(applicant_id,business_name,phone,address,category,logo_url,latitude,longitude,national_id_front_path,national_id_back_path,commercial_registration_path,tax_card_path,status)
  values(v_user,trim(p_business_name),v_phone,trim(p_address),trim(p_category),p_logo_url,p_latitude,p_longitude,p_national_id_front_path,p_national_id_back_path,p_commercial_registration_path,p_tax_card_path,'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_merchant_application(text,text,text,double precision,double precision,text,text,text,text,text) from public, anon;
grant execute on function public.submit_merchant_application(text,text,text,double precision,double precision,text,text,text,text,text) to authenticated;

drop function if exists public.submit_driver_application(text,text,text,text,text,text,text,text,text,text);
create function public.submit_driver_application(
  p_transport_mode text,
  p_motorcycle_type text,
  p_profile_photo_url text,
  p_national_id_front_path text,
  p_national_id_back_path text,
  p_driving_license_front_path text default null,
  p_driving_license_back_path text default null,
  p_vehicle_license_front_path text default null,
  p_vehicle_license_back_path text default null,
  p_police_clearance_path text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_phone text;
  v_name text;
  v_vehicle_type text;
  v_id uuid;
begin
  if v_user is null then raise exception 'يجب تسجيل الدخول أولًا.'; end if;
  if public.has_role('driver'::public.app_role) then raise exception 'دور المندوب مفعّل على الحساب بالفعل.'; end if;
  select p.phone,p.full_name into v_phone,v_name from public.profiles p where p.id=v_user and coalesce(p.is_active,true)=true;
  if v_phone is null or length(trim(v_phone))=0 then raise exception 'رقم الهاتف غير موجود في الحساب.'; end if;
  if v_name is null or length(trim(v_name))<2 then raise exception 'اسم الحساب غير مكتمل.'; end if;
  if exists(select 1 from public.driver_applications a where a.applicant_id=v_user and a.status='pending') then raise exception 'عندك طلب مندوب قيد المراجعة بالفعل.'; end if;
  if p_transport_mode not in ('motorcycle','bicycle') then raise exception 'اختار وسيلة توصيل صحيحة.'; end if;
  if length(trim(coalesce(p_profile_photo_url,'')))=0 or length(trim(coalesce(p_national_id_front_path,'')))=0 or length(trim(coalesce(p_national_id_back_path,'')))=0 then raise exception 'الصورة الشخصية وبطاقة الرقم القومي وش وظهر مطلوبة.'; end if;
  if p_transport_mode='motorcycle' then
    if length(trim(coalesce(p_motorcycle_type,'')))<2 then raise exception 'اكتب نوع أو موديل الموتوسيكل.'; end if;
    if length(trim(coalesce(p_driving_license_front_path,'')))=0 or length(trim(coalesce(p_driving_license_back_path,'')))=0 or length(trim(coalesce(p_vehicle_license_front_path,'')))=0 or length(trim(coalesce(p_vehicle_license_back_path,'')))=0 then raise exception 'رخصة القيادة ورخصة الموتوسيكل وش وظهر مطلوبة.'; end if;
    v_vehicle_type:=trim(p_motorcycle_type);
  else
    v_vehicle_type:='دراجة';
  end if;
  insert into public.driver_applications(applicant_id,full_name,phone,vehicle_type,transport_mode,motorcycle_type,profile_photo_url,national_id_front_path,national_id_back_path,driving_license_front_path,driving_license_back_path,vehicle_license_front_path,vehicle_license_back_path,police_clearance_path,status)
  values(v_user,trim(v_name),v_phone,v_vehicle_type,p_transport_mode,case when p_transport_mode='motorcycle' then trim(p_motorcycle_type) else null end,p_profile_photo_url,p_national_id_front_path,p_national_id_back_path,p_driving_license_front_path,p_driving_license_back_path,p_vehicle_license_front_path,p_vehicle_license_back_path,p_police_clearance_path,'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_driver_application(text,text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_driver_application(text,text,text,text,text,text,text,text,text,text) to authenticated;

alter table public.merchant_applications drop constraint if exists merchant_applications_pending_complete_check;
alter table public.merchant_applications add constraint merchant_applications_pending_complete_check check (
  status <> 'pending' or (
    length(trim(business_name))>=2 and length(trim(address))>=5 and length(trim(category))>=2 and
    logo_url is not null and length(trim(logo_url))>0 and latitude between -90 and 90 and longitude between -180 and 180 and
    national_id_front_path is not null and length(trim(national_id_front_path))>0 and
    national_id_back_path is not null and length(trim(national_id_back_path))>0 and
    commercial_registration_path is not null and length(trim(commercial_registration_path))>0
  )
);

alter table public.driver_applications drop constraint if exists driver_applications_pending_complete_check;
alter table public.driver_applications add constraint driver_applications_pending_complete_check check (
  status <> 'pending' or (
    profile_photo_url is not null and length(trim(profile_photo_url))>0 and
    national_id_front_path is not null and length(trim(national_id_front_path))>0 and
    national_id_back_path is not null and length(trim(national_id_back_path))>0 and
    transport_mode in ('motorcycle','bicycle') and
    (transport_mode='bicycle' or (
      motorcycle_type is not null and length(trim(motorcycle_type))>=2 and
      driving_license_front_path is not null and driving_license_back_path is not null and
      vehicle_license_front_path is not null and vehicle_license_back_path is not null
    ))
  )
);
