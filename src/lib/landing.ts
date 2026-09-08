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

  // Approved roles always win. Do not block an existing admin/merchant/driver
  // because a secondary pending-application lookup is temporarily unavailable.
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('merchant')) return '/merchant';
  if (roles.includes('driver')) return '/driver';

  const kind = await getRegistrationKind();
  if (kind === 'customer' || kind === null) {
    try {
      const pending = await getPendingApprovals();
      return resolveLandingRoute(roles, pending, kind);
    } catch {
      return '/home';
    }
  }

  try {
    const pending = await getPendingApprovals();
    return resolveLandingRoute(roles, pending, kind);
  } catch {
    // A merchant/driver application must never gain operational access on a
    // failed status check. Keep the user in onboarding instead.
    return { pathname: '/onboarding', params: { role: kind } } as LandingRoute;
  }
}
