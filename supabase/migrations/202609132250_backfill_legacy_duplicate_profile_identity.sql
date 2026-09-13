with identities as (
  select
    p.id,
    right(regexp_replace(coalesce(nullif(p.phone,''), nullif(u.raw_user_meta_data->>'phone',''), u.email, ''), '\D', '', 'g'), 10) as phone_key,
    nullif(trim(coalesce(nullif(p.full_name,''), nullif(u.raw_user_meta_data->>'full_name',''))), '') as resolved_name
  from public.profiles p
  join auth.users u on u.id = p.id
), canonical as (
  select phone_key, min(resolved_name) as canonical_name
  from identities
  where length(phone_key)=10 and resolved_name is not null
  group by phone_key
  having count(distinct resolved_name)=1
)
update public.profiles p
set
  full_name = case when nullif(trim(p.full_name),'') is null then c.canonical_name else p.full_name end,
  phone = case when nullif(trim(p.phone),'') is null then '+20' || i.phone_key else p.phone end,
  updated_at = now()
from identities i
join canonical c on c.phone_key = i.phone_key
where p.id = i.id
  and (nullif(trim(p.full_name),'') is null or nullif(trim(p.phone),'') is null);
