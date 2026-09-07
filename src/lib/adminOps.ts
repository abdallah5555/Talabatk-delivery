import { supabase } from './supabase';

export async function getAdminOverview(){
  const [profiles,userRoles,stores,orders,audit,deletions,issues,settings,areas,metrics,commercial,storeAccess,ads]=await Promise.all([
    supabase.from('profiles').select('id,full_name,phone,is_active,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('user_roles').select('user_id,role').limit(1000),
    supabase.from('stores').select('id,name,owner_id,category,is_open,rating,created_at').order('created_at',{ascending:false}).limit(200),
    supabase.from('orders').select('id,status,total,customer_id,store_id,driver_id,created_at,updated_at').order('created_at',{ascending:false}).limit(300),
    supabase.from('audit_logs').select('id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(100),
    supabase.from('deletion_requests').select('id,user_id,status,reason,created_at,admin_note').in('status',['pending','processing']).order('created_at'),
    supabase.from('driver_issues').select('id,driver_id,order_id,category,message,status,admin_note,created_at').in('status',['open','in_progress']).order('created_at'),
    supabase.from('app_settings').select('key,value,is_public,updated_at').order('key'),
    supabase.from('service_areas').select('id,name,enabled,center_latitude,center_longitude,radius_km,updated_at').order('name'),
    supabase.rpc('admin_get_usage_metrics'),
    supabase.from('platform_commercial_settings').select('merchant_subscription_required,merchant_default_monthly_price,cashier_subscription_required,cashier_default_monthly_price,driver_platform_commission_percent,updated_at').eq('id','global').single(),
    supabase.from('store_service_access').select('store_id,merchant_service_enabled,merchant_plan,merchant_monthly_price,merchant_subscription_expires_at,cashier_enabled,cashier_monthly_price,cashier_subscription_expires_at,updated_at'),
    supabase.from('ad_placements').select('id,placement_key,title,description,enabled,provider,platform,media_url,target_url,google_ad_unit_id,priority,starts_at,ends_at,updated_at').order('priority',{ascending:false}),
  ]);
  for(const q of [profiles,userRoles,stores,orders,audit,deletions,issues,settings,areas,metrics,commercial,storeAccess,ads]) if(q.error) throw q.error;
  return {profiles:profiles.data??[],userRoles:userRoles.data??[],stores:stores.data??[],orders:orders.data??[],audit:audit.data??[],deletions:deletions.data??[],issues:issues.data??[],settings:settings.data??[],areas:areas.data??[],metrics:metrics.data as any,commercial:commercial.data,storeAccess:storeAccess.data??[],ads:ads.data??[]};
}

export async function setUserActive(userId:string,active:boolean){const {data,error}=await supabase.rpc('admin_set_user_active',{p_user_id:userId,p_active:active});if(error)throw error;return data;}
export async function setRole(userId:string,role:'customer'|'merchant'|'driver'|'admin',enabled:boolean){const {data,error}=await supabase.rpc('admin_set_role',{p_user_id:userId,p_role:role,p_enabled:enabled});if(error)throw error;return data;}
export async function updateSetting(key:string,value:unknown,isPublic=true){const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول');const {data,error}=await supabase.from('app_settings').upsert({key,value,is_public:isPublic,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:'key'}).select().single();if(error)throw error;return data;}
export async function createServiceArea(input:{name:string;lat?:number|null;lng?:number|null;radiusKm?:number|null}){const {data,error}=await supabase.from('service_areas').insert({name:input.name.trim(),center_latitude:input.lat??null,center_longitude:input.lng??null,radius_km:input.radiusKm??null,enabled:true}).select().single();if(error)throw error;return data;}
export async function addServiceArea(name:string){return createServiceArea({name});}
export async function toggleServiceArea(id:string,enabled:boolean){const {data,error}=await supabase.from('service_areas').update({enabled,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data;}
export async function resolveDeletion(id:string,status:'processing'|'completed'|'rejected',note=''){const {data,error}=await supabase.from('deletion_requests').update({status,admin_note:note,resolved_at:status==='completed'||status==='rejected'?new Date().toISOString():null}).eq('id',id).select().single();if(error)throw error;return data;}
export async function resolveDriverIssue(id:string,status:'in_progress'|'resolved'|'closed',note=''){const {data,error}=await supabase.from('driver_issues').update({status,admin_note:note,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data;}

export async function updateCommercialSettings(input:{merchantSubscriptionRequired:boolean;merchantDefaultMonthlyPrice:number;cashierSubscriptionRequired:boolean;cashierDefaultMonthlyPrice:number;driverPlatformCommissionPercent:number}){const {data,error}=await supabase.rpc('admin_update_commercial_settings',{p_merchant_subscription_required:input.merchantSubscriptionRequired,p_merchant_default_monthly_price:input.merchantDefaultMonthlyPrice,p_cashier_subscription_required:input.cashierSubscriptionRequired,p_cashier_default_monthly_price:input.cashierDefaultMonthlyPrice,p_driver_platform_commission_percent:input.driverPlatformCommissionPercent});if(error)throw error;return data;}
export async function updateStoreServiceAccess(input:{storeId:string;merchantServiceEnabled:boolean;merchantPlan:string;merchantMonthlyPrice:number;merchantSubscriptionExpiresAt?:string|null;cashierEnabled:boolean;cashierMonthlyPrice:number;cashierSubscriptionExpiresAt?:string|null}){const {data,error}=await supabase.rpc('admin_update_store_service_access',{p_store_id:input.storeId,p_merchant_service_enabled:input.merchantServiceEnabled,p_merchant_plan:input.merchantPlan,p_merchant_monthly_price:input.merchantMonthlyPrice,p_merchant_subscription_expires_at:input.merchantSubscriptionExpiresAt??null,p_cashier_enabled:input.cashierEnabled,p_cashier_monthly_price:input.cashierMonthlyPrice,p_cashier_subscription_expires_at:input.cashierSubscriptionExpiresAt??null});if(error)throw error;return data;}

export async function updateAdPlacement(input:{placementKey:string;enabled:boolean;provider:'direct'|'google'|'other';platform:'all'|'android'|'ios'|'web';mediaUrl?:string;targetUrl?:string;googleAdUnitId?:string;priority:number}){
  const {data,error}=await supabase.rpc('admin_update_ad_placement',{p_placement_key:input.placementKey,p_enabled:input.enabled,p_provider:input.provider,p_platform:input.platform,p_media_url:input.mediaUrl??'',p_target_url:input.targetUrl??'',p_google_ad_unit_id:input.googleAdUnitId??'',p_priority:input.priority,p_starts_at:null,p_ends_at:null,p_other_provider_config:{}});
  if(error)throw error;return data;
}
