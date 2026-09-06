import { supabase } from './supabase';

async function uid() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا');
  return user.id;
}

export async function getDriverEarnings() {
  const userId = await uid();
  const { data, error } = await supabase.from('driver_earnings').select('order_id,gross_delivery_fee,platform_commission_percent,platform_commission_amount,driver_net_amount,earned_at').eq('driver_id', userId).order('earned_at',{ascending:false}).limit(500);
  if (error) throw error;
  const rows=(data??[]).map((x:any)=>({id:x.order_id,gross:Number(x.gross_delivery_fee??0),commissionPercent:Number(x.platform_commission_percent??0),commissionAmount:Number(x.platform_commission_amount??0),delivery_fee:Number(x.driver_net_amount??0),date:x.earned_at}));
  const now=Date.now(); const day=24*60*60*1000;
  return {
    rows,
    total: rows.reduce((s,x)=>s+x.delivery_fee,0),
    today: rows.filter(x=>now-new Date(x.date).getTime()<day).reduce((s,x)=>s+x.delivery_fee,0),
    week: rows.filter(x=>now-new Date(x.date).getTime()<7*day).reduce((s,x)=>s+x.delivery_fee,0),
    month: rows.filter(x=>now-new Date(x.date).getTime()<30*day).reduce((s,x)=>s+x.delivery_fee,0),
  };
}

export async function getDriverReviews() {
  const userId=await uid();
  const {data,error}=await supabase.from('driver_reviews').select('id,rating,comment,created_at,order_id').eq('driver_id',userId).order('created_at',{ascending:false}).limit(100);
  if(error) throw error;
  const rows=data??[];
  return { rows, average: rows.length ? rows.reduce((s,x)=>s+Number(x.rating),0)/rows.length : null };
}

export async function submitDriverIssue(input:{orderId?:string|null;category:'wrong_address'|'customer_unavailable'|'merchant_delay'|'vehicle_route'|'other';message:string}) {
  const userId=await uid();
  if (!input.message.trim()) throw new Error('اكتب تفاصيل المشكلة.');
  const {data,error}=await supabase.from('driver_issues').insert({driver_id:userId,order_id:input.orderId||null,category:input.category,message:input.message.trim()}).select().single();
  if(error) throw error;
  return data;
}

export async function getDriverIssues() {
  const userId=await uid();
  const {data,error}=await supabase.from('driver_issues').select('id,order_id,category,message,status,admin_note,created_at,updated_at').eq('driver_id',userId).order('created_at',{ascending:false}).limit(100);
  if(error) throw error;
  return data??[];
}
