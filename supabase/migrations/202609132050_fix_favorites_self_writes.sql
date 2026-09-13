drop policy if exists favorites_customer_self on public.favorites;
create policy favorites_self_read on public.favorites for select to authenticated using (user_id=(select auth.uid()));
create policy favorites_self_insert on public.favorites for insert to authenticated with check (user_id=(select auth.uid()));
create policy favorites_self_delete on public.favorites for delete to authenticated using (user_id=(select auth.uid()));
