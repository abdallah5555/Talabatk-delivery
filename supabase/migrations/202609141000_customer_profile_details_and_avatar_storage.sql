alter table public.profiles add column if not exists delivery_instructions text;
alter table public.profiles add column if not exists accessibility_notes text;
alter table public.profiles add column if not exists preferred_contact text;

create or replace function public.get_my_profile_details()
returns table(id uuid, full_name text, phone text, avatar_url text, delivery_instructions text, accessibility_notes text, preferred_contact text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, p.phone, p.avatar_url, p.delivery_instructions, p.accessibility_notes, p.preferred_contact
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.update_my_profile_details(
  p_full_name text,
  p_avatar_url text default null,
  p_delivery_instructions text default null,
  p_accessibility_notes text default null,
  p_preferred_contact text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(coalesce(p_full_name,''))) < 2 then raise exception 'full name is required'; end if;
  update public.profiles
  set full_name = left(trim(p_full_name),120),
      avatar_url = nullif(trim(coalesce(p_avatar_url,'')),''),
      delivery_instructions = nullif(left(trim(coalesce(p_delivery_instructions,'')),500),''),
      accessibility_notes = nullif(left(trim(coalesce(p_accessibility_notes,'')),500),''),
      preferred_contact = case when p_preferred_contact in ('call','chat','either') then p_preferred_contact else null end,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.get_my_profile_details() from public;
grant execute on function public.get_my_profile_details() to authenticated;
revoke all on function public.update_my_profile_details(text,text,text,text,text) from public;
grant execute on function public.update_my_profile_details(text,text,text,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('profile-avatars','profile-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "profile avatars insert own" on storage.objects;
drop policy if exists "profile avatars update own" on storage.objects;
drop policy if exists "profile avatars delete own" on storage.objects;
create policy "profile avatars insert own" on storage.objects for insert to authenticated with check (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile avatars update own" on storage.objects for update to authenticated using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "profile avatars delete own" on storage.objects for delete to authenticated using (bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);