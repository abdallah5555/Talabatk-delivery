import { supabase } from './supabase';

async function uid() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا');
  return user.id;
}

export async function getDriverEarnings() {
  const userId = await uid();
  const { data, error } = await supabase.from('orders').select('id,delivery_fee,delivered_at,updated_at,created_at').eq('driver_id', userId).eq('status','delivered').order('updated_at',{ascending:false}).limit(500);
  if (error) throw error;
  const rows=(data??[]).map((x:any)=>({id:x.id,delivery_fee:Number(x.delivery_fee??0),date:x.delivered_at??x.updated_at??x.created_at}));
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
