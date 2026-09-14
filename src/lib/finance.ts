import { supabase } from './supabase';

export type FinanceWallet={wallet_id:string;owner_kind:'driver'|'merchant'|'fleet';owner_label:string;balance:number;debt_limit:number;enforcement_enabled:boolean;blocked:boolean};
export type FinanceLedgerEntry={id:string;wallet_id:string;order_id:string|null;entry_type:string;amount:number;memo:string|null;created_at:string};
export type FleetSummary={fleet_id:string;fleet_name:string;fleet_status:string;driver_commission_percent:number;platform_commission_percent:number;drivers_count:number;wallet_balance:number;debt_limit:number;blocked:boolean};
export type FleetDriver={driver_id:string;full_name:string|null;phone:string|null;commission_percent:number|null;joined_at:string;balance:number;avg_rating:number;delivered_30d:number};

const n=(value:unknown)=>Number(value??0);

export async function getMyFinanceWallets():Promise<FinanceWallet[]>{
  const {data,error}=await supabase.rpc('get_my_finance_wallets');
  if(error)throw error;
  return(data??[]).map((x:any)=>({...x,balance:n(x.balance),debt_limit:n(x.debt_limit),blocked:Boolean(x.blocked),enforcement_enabled:Boolean(x.enforcement_enabled)}));
}

export async function getWalletEntries(walletId:string):Promise<FinanceLedgerEntry[]>{
  const {data,error}=await supabase.from('finance_ledger').select('id,wallet_id,order_id,entry_type,amount,memo,created_at').eq('wallet_id',walletId).order('created_at',{ascending:false}).limit(80);
  if(error)throw error;
  return(data??[]).map((x:any)=>({...x,amount:n(x.amount)}));
}

export async function getMyFleetSummary():Promise<FleetSummary|null>{
  const {data,error}=await supabase.rpc('get_my_fleet_summary');
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row)return null;
  return{...row,driver_commission_percent:n(row.driver_commission_percent),platform_commission_percent:n(row.platform_commission_percent),drivers_count:n(row.drivers_count),wallet_balance:n(row.wallet_balance),debt_limit:n(row.debt_limit),blocked:Boolean(row.blocked)} as FleetSummary;
}

export async function getMyFleetDrivers():Promise<FleetDriver[]>{
  const {data,error}=await supabase.rpc('get_my_fleet_drivers');
  if(error)throw error;
  return(data??[]).map((x:any)=>({...x,commission_percent:x.commission_percent==null?null:n(x.commission_percent),balance:n(x.balance),avg_rating:n(x.avg_rating),delivered_30d:n(x.delivered_30d)}));
}

export async function recordFleetDriverSettlement(driverId:string,amount:number,note=''){
  const {data,error}=await supabase.rpc('fleet_record_driver_settlement',{p_driver_id:driverId,p_amount:amount,p_note:note||null});
  if(error)throw error;
  return data;
}

export async function getAdminFinanceOverview(){
  const [settings,wallets,fleets,fleetDrivers,loyalty,rewards,profiles,roles,earnings]=await Promise.all([
    supabase.from('platform_commercial_settings').select('*').eq('id','global').single(),
    supabase.from('finance_wallets').select('id,owner_kind,owner_user_id,store_id,fleet_id,balance,debt_limit,enforcement_enabled,updated_at').order('updated_at',{ascending:false}).limit(300),
    supabase.from('fleet_companies').select('*').order('created_at',{ascending:false}),
    supabase.from('fleet_drivers').select('*').eq('active',true),
    supabase.from('loyalty_settings').select('*').eq('id','global').single(),
    supabase.from('reward_catalog').select('*').order('sort_order').order('created_at'),
    supabase.from('profiles').select('id,full_name,phone,is_active').order('created_at',{ascending:false}).limit(500),
    supabase.from('user_roles').select('user_id,role'),
    supabase.from('driver_earnings').select('order_id,driver_id,gross_delivery_fee,platform_commission_amount,fleet_commission_amount,quality_bonus_amount,driver_net_amount,rating_snapshot,earned_at').order('earned_at',{ascending:false}).limit(100),
  ]);
  for(const result of [settings,wallets,fleets,fleetDrivers,loyalty,rewards,profiles,roles,earnings])if(result.error)throw result.error;
  return{settings:settings.data,wallets:wallets.data??[],fleets:fleets.data??[],fleetDrivers:fleetDrivers.data??[],loyalty:loyalty.data,rewards:rewards.data??[],profiles:profiles.data??[],roles:roles.data??[],earnings:earnings.data??[]};
}

export async function updateFinanceSettings(input:{directDriver:number;fleetDriverPlatform:number;fleetPlatform:number;merchant:number;enforcement:boolean;driverDebt:number;merchantDebt:number;fleetDebt:number;ratingBonus:boolean;ratingRules:Array<{min:number;bonus_percent:number}>}){
  const {data,error}=await supabase.rpc('admin_update_finance_settings',{p_direct_driver_percent:input.directDriver,p_fleet_driver_platform_percent:input.fleetDriverPlatform,p_fleet_platform_percent:input.fleetPlatform,p_merchant_percent:input.merchant,p_enforcement_enabled:input.enforcement,p_driver_debt_limit:input.driverDebt,p_merchant_debt_limit:input.merchantDebt,p_fleet_debt_limit:input.fleetDebt,p_rating_bonus_enabled:input.ratingBonus,p_rating_bonus_rules:input.ratingRules});
  if(error)throw error;return data;
}

export async function createFleetCompany(input:{name:string;ownerUserId:string;driverCommission:number;platformCommission?:number|null;debtLimit?:number|null}){
  const {data,error}=await supabase.rpc('admin_create_fleet_company',{p_name:input.name,p_owner_user_id:input.ownerUserId,p_driver_commission_percent:input.driverCommission,p_platform_commission_percent:input.platformCommission??null,p_debt_limit:input.debtLimit??null});
  if(error)throw error;return data;
}

export async function setFleetDriver(input:{fleetId:string;driverId:string;active:boolean;commissionPercent?:number|null}){
  const {data,error}=await supabase.rpc('admin_set_fleet_driver',{p_fleet_id:input.fleetId,p_driver_id:input.driverId,p_active:input.active,p_commission_percent:input.commissionPercent??null});
  if(error)throw error;return data;
}

export async function postWalletAdjustment(walletId:string,amount:number,note:string){
  const {data,error}=await supabase.rpc('admin_post_wallet_adjustment',{p_wallet_id:walletId,p_amount:amount,p_note:note});
  if(error)throw error;return data;
}

export async function updateLoyaltySettings(input:{customerPer10:number;driverPerDelivery:number;merchantPerOrder:number;referral:number;enabled:boolean}){
  const {data,error}=await supabase.rpc('admin_update_loyalty_settings',{p_customer_points_per_10:input.customerPer10,p_driver_points_per_delivery:input.driverPerDelivery,p_merchant_points_per_order:input.merchantPerOrder,p_referral_points:input.referral,p_enabled:input.enabled});
  if(error)throw error;return data;
}

export async function upsertReward(input:{id?:string|null;title:string;description?:string;targetRole:'customer'|'driver'|'merchant'|'all';rewardType:'free_delivery'|'commission_free_next_order'|'priority_badge'|'custom';pointsCost:number;rewardValue?:number|null;active:boolean}){
  const {data,error}=await supabase.rpc('admin_upsert_reward_catalog',{p_id:input.id??null,p_title:input.title,p_description:input.description??'',p_target_role:input.targetRole,p_reward_type:input.rewardType,p_points_cost:input.pointsCost,p_reward_value:input.rewardValue??null,p_active:input.active});
  if(error)throw error;return data;
}
