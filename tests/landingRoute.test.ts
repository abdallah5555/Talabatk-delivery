import { describe, expect, it } from 'vitest';
import { resolveLandingRoute } from '../src/lib/landing';

describe('role-aware landing route', () => {
  it('keeps pending merchant and driver accounts out of operational dashboards', () => {
    expect(resolveLandingRoute(['customer'], { merchant: true, driver: false }, 'merchant')).toBe('/pending-approval');
    expect(resolveLandingRoute(['customer'], { merchant: false, driver: true }, 'driver')).toBe('/pending-approval');
  });

  it('sends incomplete merchant and driver registrations back to onboarding', () => {
    expect(resolveLandingRoute(['customer'], { merchant: false, driver: false }, 'merchant')).toBe('/onboarding');
    expect(resolveLandingRoute(['customer'], { merchant: false, driver: false }, 'driver')).toBe('/onboarding');
  });

  it('opens operational dashboards only after the approved role exists', () => {
    expect(resolveLandingRoute(['customer', 'merchant'], { merchant: false, driver: false }, 'merchant')).toBe('/role/merchant');
    expect(resolveLandingRoute(['customer', 'driver'], { merchant: false, driver: false }, 'driver')).toBe('/role/driver');
  });

  it('keeps admin isolated from customer flows', () => {
    expect(resolveLandingRoute(['customer', 'admin'], { merchant: false, driver: false }, 'customer')).toBe('/admin');
  });
});
