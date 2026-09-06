const transitions: Record<string, readonly string[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready: ['assigned'],
  assigned: ['picked_up'],
  picked_up: ['on_the_way'],
  on_the_way: ['delivered'],
  delivered: [],
  cancelled: [],
  rejected: [],
};

export function isValidOrderTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
