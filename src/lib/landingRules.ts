export type LandingRoute = '/admin' | '/role/merchant' | '/role/driver' | '/pending-approval' | '/onboarding' | '/home';
export type PendingApproval = { merchant: boolean; driver: boolean };
export type RegistrationKind = 'customer' | 'merchant' | 'driver' | null;

export function resolveLandingRoute(
  roles: string[],
  pending: PendingApproval,
  kind: RegistrationKind,
): LandingRoute {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('merchant')) return '/role/merchant';
  if (roles.includes('driver')) return '/role/driver';
  if (pending.merchant || pending.driver) return '/pending-approval';
  if (kind === 'merchant' || kind === 'driver') return '/onboarding';
  return '/home';
}
