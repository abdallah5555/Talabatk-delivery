-- Fix an always-true store comparison that could widen private contact access.

drop policy if exists store_private_contacts_owner_read on public.store_private_contacts;

create policy store_private_contacts_owner_read
on public.store_private_contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_private_contacts.store_id
      and s.owner_id = auth.uid()
  )
  or public.has_role('admin'::public.app_role)
  or exists (
    select 1
    from public.orders o
    where o.store_id = store_private_contacts.store_id
      and o.status not in (
        'pending'::public.order_status,
        'rejected'::public.order_status,
        'cancelled'::public.order_status
      )
      and (o.customer_id = auth.uid() or o.driver_id = auth.uid())
  )
);
