drop policy if exists roles_admin_read_all on public.user_roles;
create policy roles_admin_read_all on public.user_roles
for select to authenticated
using ((select public.has_role('admin'::public.app_role)));
