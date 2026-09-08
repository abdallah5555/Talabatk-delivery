import { getMyRoles } from './api';
import { supabase } from './supabase';
import { resolveLandingRoute, type LandingRoute, type PendingApproval, type RegistrationKind } from './landingRules';

export { resolveLandingRoute } from './landingRules';
export type { LandingRoute, PendingApproval, RegistrationKind } from './landingRules';

export async function getPendingApprovals(): Promise<PendingApproval> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { merchant: false, driver: false };
  const [merchant, driver] = await Promise.all([
    supabase.from('merchant_applications').select('id').eq('applicant_id', user.id).eq('status', 'pending').limit(1),
    supabase.from('driver_applications').select('id').eq('applicant_id', user.id).eq('status', 'pending').limit(1),
  ]);
  if (merchant.error) throw merchant.error;
  if (driver.error) throw driver.error;
  return { merchant: Boolean(merchant.data?.length), driver: Boolean(driver.data?.length) };
}

export async function getRegistrationKind(): Promise<RegistrationKind> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const value = user?.user_metadata?.registration_kind;
  return value === 'customer' || value === 'merchant' || value === 'driver' ? value : null;
}

export async function getLandingRoute(): Promise<LandingRoute> {
  const roles = await getMyRoles();

  // Approved roles always win. A temporary failure while checking pending
  // applications must never block an already-approved account.
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('merchant')) return '/role/merchant';
  if (roles.includes('driver')) return '/role/driver';

  const kind = await getRegistrationKind();
  try {
    const pending = await getPendingApprovals();
    return resolveLandingRoute(roles, pending, kind);
  } catch {
    // Fail safely: customers can still use the customer experience, while
    // merchant/driver registrations remain outside operational dashboards.
    return kind === 'merchant' || kind === 'driver' ? '/onboarding' : '/home';
  }
}
