import { describe, expect, it } from 'vitest';
import { isValidOrderTransition } from '../src/lib/orderRules';

describe('order transition hints', () => {
  it('allows the expected customer-to-delivery happy path', () => {
    expect(isValidOrderTransition('pending', 'accepted')).toBe(true);
    expect(isValidOrderTransition('accepted', 'preparing')).toBe(true);
    expect(isValidOrderTransition('preparing', 'ready')).toBe(true);
    expect(isValidOrderTransition('ready', 'assigned')).toBe(true);
    expect(isValidOrderTransition('assigned', 'picked_up')).toBe(true);
    expect(isValidOrderTransition('picked_up', 'on_the_way')).toBe(true);
    expect(isValidOrderTransition('on_the_way', 'delivered')).toBe(true);
  });

  it('allows only customer cancellation stages supported by the backend', () => {
    expect(isValidOrderTransition('pending', 'cancelled')).toBe(true);
    expect(isValidOrderTransition('accepted', 'cancelled')).toBe(true);
    expect(isValidOrderTransition('preparing', 'cancelled')).toBe(false);
  });

  it('rejects skipping or reversing critical stages', () => {
    expect(isValidOrderTransition('pending', 'delivered')).toBe(false);
    expect(isValidOrderTransition('ready', 'picked_up')).toBe(false);
    expect(isValidOrderTransition('picked_up', 'delivered')).toBe(false);
    expect(isValidOrderTransition('delivered', 'pending')).toBe(false);
  });
});
