import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MenuItem } from '@/src/types/domain';

const CART_KEY='talabatk:draft-cart:v1';
export type CartLine = { item: MenuItem; quantity: number };
type CartValue = { lines: CartLine[]; storeId: string | null; storeIds: string[]; hydrated:boolean; add: (item: MenuItem) => void; remove: (id: string) => void; clear: () => void; total: number };
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    let active=true;
    void AsyncStorage.getItem(CART_KEY).then(raw=>{
      if(!active||!raw)return;
      try{
        const parsed=JSON.parse(raw);
        if(Array.isArray(parsed)) setLines(parsed.filter((x:any)=>x?.item?.id&&x?.item?.store_id&&Number.isInteger(x?.quantity)&&x.quantity>0));
      }catch{}
    }).finally(()=>{if(active)setHydrated(true);});
    return()=>{active=false;};
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    void AsyncStorage.setItem(CART_KEY,JSON.stringify(lines)).catch(()=>undefined);
  },[hydrated,lines]);

  const add = useCallback((item: MenuItem) => setLines((current) => {
    const found = current.find((x) => x.item.id === item.id);
    return found ? current.map((x) => x.item.id === item.id ? { ...x, quantity: Math.min(30,x.quantity + 1) } : x) : [...current, { item, quantity: 1 }];
  }),[]);
  const remove = useCallback((id: string) => setLines((current) => current.map((x) => x.item.id === id ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0)),[]);
  const clear=useCallback(()=>{setLines([]);if(hydrated)void AsyncStorage.removeItem(CART_KEY).catch(()=>undefined);},[hydrated]);
  const value = useMemo(() => ({
    lines,
    storeId: lines[0]?.item.store_id ?? null,
    storeIds: Array.from(new Set(lines.map(x=>x.item.store_id))),
    hydrated,
    add,
    remove,
    clear,
    total: lines.reduce((sum, x) => sum + x.item.price * x.quantity, 0),
  }), [lines,hydrated,add,remove,clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('CartProvider missing'); return value; }
