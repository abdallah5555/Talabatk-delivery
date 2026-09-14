import { getMyRoles } from './api';
import { supabase } from './supabase';
import { resolveLandingRoute, type LandingRoute, type PendingApproval, type RegistrationKind } from './landingRules';

export { resolveLandingRoute } from './landingRules';
export type { LandingRoute, PendingApproval, RegistrationKind } from './landingRules';

async function getSessionUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session?.user ?? null;
}

export async function getPendingApprovals(): Promise<PendingApproval> {
  const user = await getSessionUser();
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
  const user = await getSessionUser();
  const value = user?.user_metadata?.registration_kind;
  return value === 'customer' || value === 'merchant' || value === 'driver' ? value : null;
}

async function isFleetManager(userId:string){
  const {data,error}=await supabase.from('fleet_companies').select('id').eq('owner_user_id',userId).neq('status','closed').limit(1);
  if(error)return false;
  return Boolean(data?.length);
}

export async function getLandingRoute(): Promise<LandingRoute> {
  const user = await getSessionUser();
  if (!user) return '/home';
  const [kind,roles,fleetManager]=await Promise.all([getRegistrationKind(),getMyRoles(),isFleetManager(user.id)]);

  if (roles.includes('admin')) return '/admin';
  // A company owner is intentionally NOT a platform admin. They land in the
  // scoped fleet dashboard and RLS limits them to their company and drivers.
  if (fleetManager) return '/fleet';

  // Customer accounts are active immediately and never depend on approval tables.
  if (kind === 'customer') return '/home';
  if (roles.includes('merchant')) return '/role/merchant';
  if (roles.includes('driver')) return '/role/driver';

  try {
    const pending = await getPendingApprovals();
    return resolveLandingRoute(roles, pending, kind);
  } catch {
    return kind === 'merchant' || kind === 'driver' ? '/onboarding' : '/home';
  }
}
