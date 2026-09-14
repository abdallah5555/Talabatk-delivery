import { supabase } from './supabase';

export type RewardSummary={points:number;lifetime_points:number;referral_code:string;referrals_count:number};
export type RewardEvent={id:string;points_delta:number;source:string;order_id:string|null;note:string|null;created_at:string};

export async function getMyRewards():Promise<RewardSummary>{
  const {data,error}=await supabase.rpc('get_my_rewards');
  if(error)throw error;
  const row=(Array.isArray(data)?data[0]:data) as any;
  if(!row)throw new Error('تعذر تحميل نقاطك.');
  return{points:Number(row.points??0),lifetime_points:Number(row.lifetime_points??0),referral_code:String(row.referral_code??''),referrals_count:Number(row.referrals_count??0)};
}

export async function getMyRewardEvents():Promise<RewardEvent[]>{
  const {data,error}=await supabase.from('reward_events').select('id,points_delta,source,order_id,note,created_at').order('created_at',{ascending:false}).limit(50);
  if(error)throw error;
  return(data??[]).map((row:any)=>({...row,points_delta:Number(row.points_delta)}));
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
