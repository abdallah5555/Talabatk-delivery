alter table public.merchant_applications
  add column if not exists national_id_front_path text,
  add column if not exists national_id_back_path text,
  add column if not exists commercial_registration_path text,
  add column if not exists tax_card_path text;

alter table public.driver_applications
  add column if not exists national_id_front_path text,
  add column if not exists national_id_back_path text,
  add column if not exists police_clearance_path text;
