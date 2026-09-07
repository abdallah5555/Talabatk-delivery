import { getMyRoles } from './api';
import { supabase } from './supabase';

export type LandingRoute = '/admin' | '/role/merchant' | '/role/driver' | '/pending-approval' | '/home';

export type PendingApproval = { merchant: boolean; driver: boolean };

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

export async function getLandingRoute(): Promise<LandingRoute> {
  const roles = await getMyRoles();
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('merchant')) return '/role/merchant';
  if (roles.includes('driver')) return '/role/driver';

  const pending = await getPendingApprovals();
  if (pending.merchant || pending.driver) return '/pending-approval';
  return '/home';
}
