create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_created_idx on public.order_messages(order_id, created_at);
create index if not exists order_messages_sender_idx on public.order_messages(sender_id);

create or replace function public.can_access_order_chat(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and (
        o.customer_id = auth.uid()
        or o.driver_id = auth.uid()
        or exists (
          select 1 from public.stores s
          where s.id = o.store_id and s.owner_id = auth.uid()
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid() and ur.role = 'admin'
        )
      )
  );
$$;

revoke all on function public.can_access_order_chat(uuid) from public;
grant execute on function public.can_access_order_chat(uuid) to authenticated;

alter table public.order_messages enable row level security;

drop policy if exists order_messages_read_participants on public.order_messages;
create policy order_messages_read_participants
on public.order_messages for select
to authenticated
using (public.can_access_order_chat(order_id));

drop policy if exists order_messages_insert_participants on public.order_messages;
create policy order_messages_insert_participants
on public.order_messages for insert
to authenticated
with check (sender_id = auth.uid() and public.can_access_order_chat(order_id));

revoke all on public.order_messages from anon;
grant select, insert on public.order_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_messages'
  ) then
    alter publication supabase_realtime add table public.order_messages;
  end if;
end $$;
