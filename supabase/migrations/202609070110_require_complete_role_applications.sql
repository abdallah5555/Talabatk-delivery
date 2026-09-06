alter table public.merchant_applications drop constraint if exists merchant_applications_pending_complete_check;
alter table public.merchant_applications add constraint merchant_applications_pending_complete_check check (
  status <> 'pending' or (
    length(trim(business_name)) >= 2 and length(trim(address)) >= 5 and length(trim(category)) >= 2
    and logo_url is not null and length(trim(logo_url)) > 0
    and latitude between -90 and 90 and longitude between -180 and 180
  )
);

alter table public.driver_applications drop constraint if exists driver_applications_pending_complete_check;
alter table public.driver_applications add constraint driver_applications_pending_complete_check check (
  status <> 'pending' or (
    profile_photo_url is not null and length(trim(profile_photo_url)) > 0
    and transport_mode in ('motorcycle','bicycle')
    and (
      transport_mode='bicycle' or (
        motorcycle_type is not null and length(trim(motorcycle_type)) >= 2
        and driving_license_front_path is not null and driving_license_back_path is not null
        and vehicle_license_front_path is not null and vehicle_license_back_path is not null
      )
    )
  )
);

create unique index if not exists merchant_applications_one_pending_per_user_idx
  on public.merchant_applications(applicant_id) where status='pending';
create unique index if not exists driver_applications_one_pending_per_user_idx
  on public.driver_applications(applicant_id) where status='pending';
