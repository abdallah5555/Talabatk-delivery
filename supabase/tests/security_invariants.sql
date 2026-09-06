do $$
declare v_count int;
begin
  select count(*) into v_count
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
  if v_count<>0 then raise exception 'SECURITY TEST FAILED: % public tables have RLS disabled',v_count; end if;

  if has_table_privilege('authenticated','public.order_items','INSERT')
     or has_table_privilege('authenticated','public.order_items','UPDATE')
     or has_table_privilege('authenticated','public.order_items','DELETE') then
    raise exception 'SECURITY TEST FAILED: authenticated can directly mutate order_items';
  end if;

  if has_column_privilege('authenticated','public.profiles','is_active','UPDATE') then
    raise exception 'SECURITY TEST FAILED: authenticated can update profiles.is_active';
  end if;

  if has_table_privilege('authenticated','public.user_security','SELECT')
     or has_table_privilege('authenticated','public.trusted_devices','SELECT') then
    raise exception 'SECURITY TEST FAILED: sensitive security tables directly readable';
  end if;

  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('create_order_idempotent','driver_accept_order','driver_update_order','merchant_update_order','admin_set_role','admin_set_user_active','set_pin','verify_pin','create_pos_sale','adjust_inventory','submit_store_review','submit_driver_review')
      and has_function_privilege('anon',p.oid,'EXECUTE')
  ) then raise exception 'SECURITY TEST FAILED: anon can execute sensitive RPC'; end if;

  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_order_secure','validate_coupon')
      and has_function_privilege('authenticated',p.oid,'EXECUTE')
  ) then raise exception 'SECURITY TEST FAILED: retired checkout/coupon RPC remains executable'; end if;
end $$;

select 'security_invariants_passed' as result;
