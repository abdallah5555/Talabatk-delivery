import { getMyRoles } from './api';

export type LandingRoute = '/admin' | '/role/merchant' | '/role/driver' | '/home';

export async function getLandingRoute(): Promise<LandingRoute> {
  const roles = await getMyRoles();
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('merchant')) return '/role/merchant';
  if (roles.includes('driver')) return '/role/driver';
  return '/home';
}
