-- Applied to project vriwhtuxagnbfxybjviz on 2026-09-06.
drop policy if exists order_items_customer_insert on public.order_items;
drop policy if exists order_items_customer_delete on public.order_items;

revoke insert, update, delete, truncate, references, trigger
on public.order_items from authenticated, anon;

revoke execute on function public.create_order_secure(uuid,jsonb,text,text,text,text)
from public, anon, authenticated;
