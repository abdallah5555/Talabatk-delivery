-- Public-read policies call is_admin() as part of their predicate.
-- Anonymous callers need EXECUTE so those public SELECT policies do not error.
-- auth.uid() is null for anon, therefore is_admin() safely returns false.

grant execute on function public.is_admin() to anon;
