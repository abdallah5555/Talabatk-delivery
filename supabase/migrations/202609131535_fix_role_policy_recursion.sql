-- Prevent RLS recursion when role-aware policies call has_role()/is_admin().
-- These helpers must bypass user_roles RLS internally, while staying scoped
-- to auth.uid() and executable only by authenticated users.

create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = p_role
  );
$$;

revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.has_role(public.app_role) from anon;
grant execute on function public.has_role(public.app_role) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'::public.app_role
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
