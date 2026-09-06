-- Applied to project vriwhtuxagnbfxybjviz on 2026-09-06.
create table if not exists public.order_status_history (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;
drop policy if exists order_status_history_read on public.order_status_history;
create policy order_status_history_read on public.order_status_history for select to authenticated
using (exists(select 1 from public.orders o where o.id=order_id));

create or replace function public.log_order_status_history()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history(order_id,status,actor_id) values(new.id,new.status,auth.uid());
  end if;
  return new;
end;
$$;
drop trigger if exists trg_order_status_history on public.orders;
create trigger trg_order_status_history after insert or update of status on public.orders
for each row execute function public.log_order_status_history();

insert into public.order_status_history(order_id,status,actor_id,created_at)
select o.id,o.status,null,o.created_at from public.orders o
where not exists(select 1 from public.order_status_history h where h.order_id=o.id);

create or replace function public.get_order_tracking(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_order public.orders%rowtype; v_driver public.driver_status%rowtype; v_allowed boolean:=false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_order from public.orders where id=p_order_id;
  if not found then raise exception 'Order not found'; end if;
  v_allowed := v_order.customer_id=v_uid or v_order.driver_id=v_uid or public.has_role('admin') or exists(select 1 from public.stores s where s.id=v_order.store_id and s.owner_id=v_uid);
  if not v_allowed then raise exception 'Not authorized'; end if;
  if v_order.driver_id is not null and v_order.status in ('assigned','picked_up','on_the_way') then
    select * into v_driver from public.driver_status where user_id=v_order.driver_id;
  end if;
  return jsonb_build_object(
    'id',v_order.id,'status',v_order.status,'total',v_order.total,'delivery_fee',v_order.delivery_fee,
    'delivery_address',v_order.delivery_address,'estimated_minutes',v_order.estimated_minutes,
    'driver_id',v_order.driver_id,'driver_latitude',v_driver.latitude,'driver_longitude',v_driver.longitude,
    'driver_location_updated_at',v_driver.updated_at,'updated_at',v_order.updated_at,'created_at',v_order.created_at
  );
end;
$$;
revoke all on function public.get_order_tracking(uuid) from public,anon;
grant execute on function public.get_order_tracking(uuid) to authenticated,service_role;
