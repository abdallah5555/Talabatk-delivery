import { supabase } from './supabase';

export async function getAdminOverview(){
  const [profiles,stores,orders,audit,deletions,issues,settings,areas,metrics]=await Promise.all([
    supabase.from('profiles').select('id,full_name,phone,is_active,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('stores').select('id,name,owner_id,category,is_open,rating,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('orders').select('id,status,total,customer_id,store_id,driver_id,created_at,updated_at').order('created_at',{ascending:false}).limit(300),
    supabase.from('audit_logs').select('id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('deletion_requests').select('id,user_id,status,reason,created_at,admin_note').in('status',['pending','processing']).order('created_at'),
    supabase.from('driver_issues').select('id,driver_id,order_id,category,message,status,admin_note,created_at').in('status',['open','in_progress']).order('created_at'),
    supabase.from('app_settings').select('key,value,is_public,updated_at').order('key'),
    supabase.from('service_areas').select('id,name,enabled,center_latitude,center_longitude,radius_km,updated_at').order('name'),
    supabase.rpc('admin_get_usage_metrics'),
  ]);
  for(const q of [profiles,stores,orders,audit,deletions,issues,settings,areas,metrics]) if(q.error) throw q.error;
  return {profiles:profiles.data??[],stores:stores.data??[],orders:orders.data??[],audit:audit.data??[],deletions:deletions.data??[],issues:issues.data??[],settings:settings.data??[],areas:areas.data??[],metrics:metrics.data as any};
}

export async function setUserActive(userId:string,active:boolean){const {data,error}=await supabase.rpc('admin_set_user_active',{p_user_id:userId,p_active:active});if(error)throw error;return data;}
export async function setRole(userId:string,role:'customer'|'merchant'|'driver'|'admin',enabled:boolean){const {data,error}=await supabase.rpc('admin_set_role',{p_user_id:userId,p_role:role,p_enabled:enabled});if(error)throw error;return data;}
export async function updateSetting(key:string,value:unknown,isPublic=true){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول');const {data,error}=await supabase.from('app_settings').upsert({key,value,is_public:isPublic,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'key'}).select().single();if(error)throw error;return data;}
export async function createServiceArea(input:{name:string;lat?:number|null;lng?:number|null;radiusKm?:number|null}){const {data,error}=await supabase.from('service_areas').insert({name:input.name.trim(),center_latitude:input.lat??null,center_longitude:input.lng??null,radius_km:input.radiusKm??null,enabled:true}).select().single();if(error)throw error;return data;}
export async function addServiceArea(name:string){return createServiceArea({name});}
export async function toggleServiceArea(id:string,enabled:boolean){const {data,error}=await supabase.from('service_areas').update({enabled,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data;}
export async function resolveDeletion(id:string,status:'processing'|'completed'|'rejected',note=''){const {data,error}=await supabase.from('deletion_requests').update({status,admin_note:note,resolved_at:status==='completed'||status==='rejected'?new Date().toISOString():null}).eq('id',id).select().single();if(error)throw error;return data;}
export async function resolveDriverIssue(id:string,status:'in_progress'|'resolved'|'closed',note=''){const {data,error}=await supabase.from('driver_issues').update({status,admin_note:note,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data;}
