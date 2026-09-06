import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import type { MenuItem } from '@/src/types/domain';

type CartLine = { item: MenuItem; quantity: number };
type CartValue = { lines: CartLine[]; storeId: string | null; add: (item: MenuItem) => void; remove: (id: string) => void; clear: () => void; total: number };
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const add = (item: MenuItem) => setLines((current) => {
    const sameStore = current.length === 0 || current[0]?.item.store_id === item.store_id;
    const base = sameStore ? current : [];
    const found = base.find((x) => x.item.id === item.id);
    return found ? base.map((x) => x.item.id === item.id ? { ...x, quantity: x.quantity + 1 } : x) : [...base, { item, quantity: 1 }];
  });
  const remove = (id: string) => setLines((current) => current.map((x) => x.item.id === id ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0));
  const value = useMemo(() => ({ lines, storeId: lines[0]?.item.store_id ?? null, add, remove, clear: () => setLines([]), total: lines.reduce((sum, x) => sum + x.item.price * x.quantity, 0) }), [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('CartProvider missing'); return value; }
