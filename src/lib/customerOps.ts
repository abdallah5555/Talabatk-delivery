import { supabase } from './supabase';
import type { MenuItem } from '@/src/types/domain';

export async function getMyReview(orderId: string) {
  const { data, error } = await supabase.from('store_reviews').select('id,rating,comment,created_at').eq('order_id', orderId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitStoreReview(orderId: string, rating: number, comment = '') {
  const { data, error } = await supabase.rpc('submit_store_review', { p_order_id: orderId, p_rating: rating, p_comment: comment.trim() });
  if (error) throw error;
  return data;
}

export async function getMyDriverReview(orderId:string){
  const {data,error}=await supabase.from('driver_reviews').select('id,rating,comment,created_at').eq('order_id',orderId).maybeSingle();
  if(error)throw error;
  return data;
}

export async function submitDriverReview(orderId:string,rating:number,comment=''){
  const {data,error}=await supabase.rpc('submit_driver_review',{p_order_id:orderId,p_rating:rating,p_comment:comment.trim()});
  if(error)throw error;
  return data;
}

export async function cancelMyOrder(orderId:string){
  const {data,error}=await supabase.rpc('customer_cancel_order',{p_order_id:orderId});
  if(error)throw error;
  return data;
}

export async function getReorderLines(orderId: string): Promise<{ item: MenuItem; quantity: number }[]> {
  const { data, error } = await supabase.from('order_items').select('quantity,menu_items(id,store_id,name,description,image_url,price,category,is_available)').eq('order_id', orderId);
  if (error) throw error;
  const result: { item: MenuItem; quantity: number }[] = [];
  for (const row of data ?? []) {
    const joined = Array.isArray(row.menu_items) ? row.menu_items[0] : row.menu_items;
    if (!joined || !joined.is_available) continue;
    result.push({ item: { ...joined, price: Number(joined.price) } as MenuItem, quantity: Number(row.quantity) });
  }
  return result;
}
