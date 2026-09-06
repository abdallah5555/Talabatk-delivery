import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';
import type { MenuItem } from '@/src/types/domain';

export type CartLine = { item: MenuItem; quantity: number };
type CartValue = { lines: CartLine[]; storeId: string | null; storeIds: string[]; add: (item: MenuItem) => void; remove: (id: string) => void; clear: () => void; total: number };
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const add = (item: MenuItem) => setLines((current) => {
    const found = current.find((x) => x.item.id === item.id);
    return found ? current.map((x) => x.item.id === item.id ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { item, quantity: 1 }];
  });
  const remove = (id: string) => setLines((current) => current.map((x) => x.item.id === id ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0));
  const value = useMemo(() => ({
    lines,
    storeId: lines[0]?.item.store_id ?? null,
    storeIds: Array.from(new Set(lines.map(x=>x.item.store_id))),
    add,
    remove,
    clear: () => setLines([]),
    total: lines.reduce((sum, x) => sum + x.item.price * x.quantity, 0),
  }), [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('CartProvider missing'); return value; }
