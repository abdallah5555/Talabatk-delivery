import { supabase } from './supabase';

export async function setStoreOpen(storeId:string,isOpen:boolean){
  const {data,error}=await supabase.from('stores').update({is_open:isOpen,updated_at:new Date().toISOString()}).eq('id',storeId).select('id,is_open').single();
  if(error)throw error;
  return data;
}

export async function getMerchantMenu(storeId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id,store_id,name,description,image_url,price,category,is_available,created_at,updated_at')
    .eq('store_id', storeId)
    .order('category')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((x) => ({ ...x, price: Number(x.price) }));
}

export async function addMenuItem(input: { storeId: string; name: string; description?: string; price: number; category?: string }) {
  if (!input.name.trim()) throw new Error('اسم المنتج مطلوب');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('السعر غير صالح');
  const { data, error } = await supabase.from('menu_items').insert({
    store_id: input.storeId,
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    price: input.price,
    category: input.category?.trim() || 'عام',
    is_available: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function setMenuAvailability(id: string, isAvailable: boolean) {
  const { data, error } = await supabase.from('menu_items').update({ is_available: isAvailable, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function updateMenuPrice(id: string, price: number) {
  if (!Number.isFinite(price) || price < 0) throw new Error('السعر غير صالح');
  const { data, error } = await supabase.from('menu_items').update({ price, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getInventory(storeId: string) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id,store_id,name,unit,quantity,low_stock_threshold,cost_price,updated_at')
    .eq('store_id', storeId)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((x) => ({ ...x, quantity: Number(x.quantity), low_stock_threshold: Number(x.low_stock_threshold), cost_price: Number(x.cost_price) }));
}

export async function addInventoryItem(input: { storeId: string; name: string; unit?: string; quantity?: number; lowStockThreshold?: number; costPrice?: number }) {
  if (!input.name.trim()) throw new Error('اسم الصنف مطلوب');
  const quantity = input.quantity ?? 0;
  if (!Number.isFinite(quantity) || quantity < 0) throw new Error('الكمية غير صالحة');
  const { data, error } = await supabase.from('inventory_items').insert({
    store_id: input.storeId,
    name: input.name.trim(),
    unit: input.unit?.trim() || 'وحدة',
    quantity,
    low_stock_threshold: input.lowStockThreshold ?? 5,
    cost_price: input.costPrice ?? 0,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function adjustInventory(itemId: string, delta: number, reason = 'manual') {
  if (!Number.isFinite(delta) || delta === 0) throw new Error('أدخل كمية صحيحة');
  const { data, error } = await supabase.rpc('adjust_inventory', { p_item_id: itemId, p_delta: delta, p_reason: reason });
  if (error) throw error;
  return Number(data);
}
