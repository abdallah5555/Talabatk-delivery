const transitions: Record<string, readonly string[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['assigned', 'picked_up'],
  assigned: ['picked_up'],
  picked_up: ['delivered'],
  delivered: [], cancelled: [], rejected: [],
};

export function isValidOrderTransition(from: string, to: string) {
  return transitions[from]?.includes(to) ?? false;
}
