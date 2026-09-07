drop policy if exists addresses_self on public.addresses;
create policy addresses_customer_self on public.addresses
for all to authenticated
using ((select auth.uid()) = user_id and (select public.has_role('customer'::public.app_role)))
with check ((select auth.uid()) = user_id and (select public.has_role('customer'::public.app_role)));

drop policy if exists favorites_self on public.favorites;
create policy favorites_customer_self on public.favorites
for all to authenticated
using ((select auth.uid()) = user_id and (select public.has_role('customer'::public.app_role)))
with check ((select auth.uid()) = user_id and (select public.has_role('customer'::public.app_role)));
