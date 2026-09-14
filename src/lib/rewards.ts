import { supabase } from './supabase';

export type RewardSummary={points:number;lifetime_points:number;referral_code:string;referrals_count:number};
export type RewardEvent={id:string;points_delta:number;source:string;order_id:string|null;note:string|null;created_at:string};
export type RewardCatalogItem={id:string;title:string;description:string|null;target_role:'customer'|'driver'|'merchant'|'all';reward_type:'free_delivery'|'commission_free_next_order'|'priority_badge'|'custom';points_cost:number;reward_value:number|null;active:boolean};
export type RewardRedemption={id:string;reward_id:string;points_spent:number;status:string;order_id:string|null;created_at:string;used_at:string|null;expires_at:string|null};

export async function getMyRewards():Promise<RewardSummary>{
  const {data,error}=await supabase.rpc('get_my_rewards');
  if(error)throw error;
  const row=(Array.isArray(data)?data[0]:data) as any;
  if(!row)throw new Error('تعذر تحميل نقاطك.');
  return{points:Number(row.points??0),lifetime_points:Number(row.lifetime_points??0),referral_code:String(row.referral_code??''),referrals_count:Number(row.referrals_count??0)};
}

export async function getMyRewardEvents():Promise<RewardEvent[]>{
  const {data,error}=await supabase.from('reward_events').select('id,points_delta,source,order_id,note,created_at').order('created_at',{ascending:false}).limit(80);
  if(error)throw error;
  return(data??[]).map((row:any)=>({...row,points_delta:Number(row.points_delta)}));
}

export async function getRewardCatalog():Promise<RewardCatalogItem[]>{
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return[];
  const [{data:roles,error:rolesError},{data,error}]=await Promise.all([
    supabase.from('user_roles').select('role').eq('user_id',user.id),
    supabase.from('reward_catalog').select('id,title,description,target_role,reward_type,points_cost,reward_value,active').eq('active',true).order('sort_order').order('created_at'),
  ]);
  if(rolesError)throw rolesError;if(error)throw error;
  const roleSet=new Set((roles??[]).map((x:any)=>String(x.role)));
  return(data??[]).filter((x:any)=>x.target_role==='all'||roleSet.has(String(x.target_role))).map((x:any)=>({...x,points_cost:Number(x.points_cost),reward_value:x.reward_value==null?null:Number(x.reward_value)}));
}

export async function getMyRewardRedemptions():Promise<RewardRedemption[]>{
  const {data,error}=await supabase.from('reward_redemptions').select('id,reward_id,points_spent,status,order_id,created_at,used_at,expires_at').order('created_at',{ascending:false}).limit(50);
  if(error)throw error;
  return(data??[]).map((x:any)=>({...x,points_spent:Number(x.points_spent)}));
}

export async function redeemReward(rewardId:string){
  const {data,error}=await supabase.rpc('redeem_reward',{p_reward_id:rewardId});
  if(error){
    const message=String(error.message||'');
    if(message.includes('not enough points'))throw new Error('نقاطك الحالية مش كفاية للمكافأة دي.');
    if(message.includes('not available for your role'))throw new Error('المكافأة دي مش متاحة لنوع حسابك.');
    throw error;
  }
  return data;
}

export async function claimReferralCode(code:string){
  const normalized=code.trim().toUpperCase();
  if(normalized.length<4)throw new Error('اكتب كود دعوة صحيح.');
  const {data,error}=await supabase.rpc('claim_referral_code',{p_code:normalized});
  if(error){
    const message=String(error.message||'');
    if(message.includes('cannot refer yourself'))throw new Error('مينفعش تستخدم كود دعوتك أنت.');
    if(message.includes('before first delivered order'))throw new Error('كود الدعوة بيتسجل قبل أول طلب مكتمل فقط.');
    if(message.includes('invalid code'))throw new Error('كود الدعوة غير صحيح.');
    throw error;
  }
  if(!data)throw new Error('الكود مستخدم بالفعل أو غير متاح للحساب ده.');
  return true;
}

export function rewardLevel(lifetime:number){
  if(lifetime>=1000)return{name:'بلاتيني',next:null as number|null};
  if(lifetime>=500)return{name:'ذهبي',next:1000};
  if(lifetime>=250)return{name:'فضي',next:500};
  if(lifetime>=100)return{name:'برونزي',next:250};
  return{name:'بداية',next:100};
}
