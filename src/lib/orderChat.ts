import { supabase } from './supabase';

export type OrderMessage={id:string;order_id:string;sender_id:string;message:string;created_at:string};

export async function getOrderMessages(orderId:string):Promise<OrderMessage[]>{
  const {data,error}=await supabase.from('order_messages').select('id,order_id,sender_id,message,created_at').eq('order_id',orderId).order('created_at');
  if(error)throw error;
  return (data??[]) as OrderMessage[];
}

export async function sendOrderMessage(orderId:string,message:string){
  const clean=message.trim();
  if(!clean||clean.length>1000)throw new Error('اكتب رسالة من 1 إلى 1000 حرف.');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('سجل الدخول الأول.');
  const {data,error}=await supabase.from('order_messages').insert({order_id:orderId,sender_id:user.id,message:clean}).select('id,order_id,sender_id,message,created_at').single();
  if(error)throw new Error('تعذر إرسال الرسالة. تأكد إنك طرف في الطلب وحاول تاني.');
  return data as OrderMessage;
}

export function subscribeToOrderMessages(orderId:string,onMessage:(message:OrderMessage)=>void){
  const channel=supabase.channel(`order-chat:${orderId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'order_messages',filter:`order_id=eq.${orderId}`},payload=>onMessage(payload.new as OrderMessage)).subscribe();
  return()=>{void supabase.removeChannel(channel);};
}
