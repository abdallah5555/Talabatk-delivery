import { describe, expect, it } from 'vitest';
import { isValidOrderTransition } from '../src/lib/orderRules';

describe('order transition hints', () => {
  it('allows the expected happy path', () => {
    expect(isValidOrderTransition('pending', 'accepted')).toBe(true);
    expect(isValidOrderTransition('preparing', 'ready')).toBe(true);
    expect(isValidOrderTransition('picked_up', 'delivered')).toBe(true);
  });
  it('rejects skipping critical stages', () => {
    expect(isValidOrderTransition('pending', 'delivered')).toBe(false);
    expect(isValidOrderTransition('delivered', 'pending')).toBe(false);
  });
});
