import { supabase } from './supabase';
import type { MenuItem, Order, Role, Store } from '@/src/types/domain';

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select('id,owner_id,name,category,description,image_url,address,delivery_fee,is_open,prep_minutes,rating').order('rating', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, delivery_fee: Number(row.delivery_fee ?? 0), rating: Number(row.rating ?? 0) })) as Store[];
}

export async function getMenu(storeId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('id,store_id,name,description,image_url,price,category,is_available').eq('store_id', storeId).eq('is_available', true).order('category');
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, price: Number(row.price) })) as MenuItem[];
}

export async function getMyRoles(): Promise<Role[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map((x) => x.role as Role);
}

export async function getMyOrders(): Promise<Order[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('orders').select('id,customer_id,store_id,driver_id,status,subtotal,delivery_fee,total,payment_method,delivery_address,customer_note,scheduled_for,created_at').eq('customer_id', user.id).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, subtotal: Number(row.subtotal), delivery_fee: Number(row.delivery_fee), total: Number(row.total) })) as Order[];
}

export async function getMyOrder(orderId: string): Promise<Order> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول');
  const { data, error } = await supabase.from('orders').select('id,customer_id,store_id,driver_id,status,subtotal,delivery_fee,total,payment_method,delivery_address,customer_note,scheduled_for,created_at').eq('id', orderId).eq('customer_id', user.id).single();
  if (error) throw error;
  return { ...data, subtotal: Number(data.subtotal), delivery_fee: Number(data.delivery_fee), total: Number(data.total) } as Order;
}

export async function getOrderTimeline(orderId: string) {
  const { data, error } = await supabase.from('order_status_history').select('id,status,created_at').eq('order_id', orderId).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export function subscribeToOrder(orderId: string, onChange: () => void) {
  const channel = supabase.channel(`order:${orderId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${orderId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function createOrder(input: { storeId: string; items: { id: string; quantity: number }[]; address: string; note?: string; requestId: string; paymentMethod?: 'cash'|'merchant_paid_online'; scheduledFor?: string|null }) {
  const { data, error } = await supabase.rpc('create_order_scheduled', {
    p_store_id: input.storeId,
    p_items: input.items.map((item) => ({ menu_item_id: item.id, quantity: item.quantity })),
    p_address: input.address,
    p_request_id: input.requestId,
    p_payment_method: input.paymentMethod ?? 'cash',
    p_note: input.note ?? '',
    p_scheduled_for: input.scheduledFor ?? null,
  });
  if (error) throw error;
  return data;
}
