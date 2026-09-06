import { supabase } from './supabase';

export async function getMerchantServiceAccess(storeId:string){
  const {data,error}=await supabase.rpc('get_my_store_service_access',{p_store_id:storeId});
  if(error) throw error;
  return Array.isArray(data)?data[0]??null:data;
}

export async function createPosSale(storeId:string,items:Array<{menuItemId:string;quantity:number}>,note=''){
  if(!items.length) throw new Error('أضف منتجًا واحدًا على الأقل.');
  const {data,error}=await supabase.rpc('create_pos_sale',{p_store_id:storeId,p_items:items.map(x=>({menu_item_id:x.menuItemId,quantity:x.quantity})),p_note:note.trim()});
  if(error) throw error; return data;
}

export async function getMerchantReport(storeId:string){
  const [orders,pos,items]=await Promise.all([
    supabase.from('orders').select('id,status,total,created_at,updated_at').eq('store_id',storeId).order('created_at',{ascending:false}).limit(1000),
    supabase.from('pos_sales').select('id,total,created_at').eq('store_id',storeId).order('created_at',{ascending:false}).limit(1000),
    supabase.from('order_items').select('name_snapshot,quantity,line_total,orders!inner(store_id,status,created_at)').eq('orders.store_id',storeId).limit(5000),
  ]);
  if(orders.error) throw orders.error;if(pos.error) throw pos.error;if(items.error) throw items.error;
  const delivered=(orders.data??[]).filter((x:any)=>x.status==='delivered');
  const deliveryRevenue=delivered.reduce((s:number,x:any)=>s+Number(x.total??0),0);
  const posRevenue=(pos.data??[]).reduce((s:number,x:any)=>s+Number(x.total??0),0);
  const statusCounts:Record<string,number>={}; for(const o of orders.data??[]) statusCounts[o.status]=(statusCounts[o.status]??0)+1;
  const products:Record<string,{quantity:number,revenue:number}>={};
  for(const row of items.data??[] as any[]){if(row.orders?.status!=='delivered')continue;const p=products[row.name_snapshot]??{quantity:0,revenue:0};p.quantity+=Number(row.quantity??0);p.revenue+=Number(row.line_total??0);products[row.name_snapshot]=p;}
  return {orderCount:(orders.data??[]).length,deliveredCount:delivered.length,deliveryRevenue,posRevenue,totalRevenue:deliveryRevenue+posRevenue,statusCounts,bestProducts:Object.entries(products).sort((a,b)=>b[1].quantity-a[1].quantity).slice(0,10),recentPos:pos.data??[]};
}
