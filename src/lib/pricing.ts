import { supabase } from './supabase';

export type DeliveryQuote={customer_fee:number;driver_gross_fee:number;distance_km:number|null;estimated_drive_minutes:number|null;pricing_model:string;details:Record<string,unknown>};

const n=(value:unknown)=>value==null?null:Number(value);

export async function getDeliveryQuote(storeId:string,address:string):Promise<DeliveryQuote>{
  const {data,error}=await supabase.rpc('calculate_delivery_quote',{p_store_id:storeId,p_address:address});
  if(error)throw error;
  const row=Array.isArray(data)?data[0]:data;
  if(!row)throw new Error('تعذر حساب سعر التوصيل.');
  return{customer_fee:Number(row.customer_fee??0),driver_gross_fee:Number(row.driver_gross_fee??0),distance_km:n(row.distance_km),estimated_drive_minutes:n(row.estimated_drive_minutes),pricing_model:String(row.pricing_model??''),details:(row.details??{}) as Record<string,unknown>};
}

export async function updateDeliveryPricing(input:{enabled:boolean;baseFee:number;minFee:number;includedKm:number;perExtraKm:number;perMinute:number;roadFactor:number;avgSpeed:number;maxServiceKm:number;maxFee:number;roundStep:number}){
  const {data,error}=await supabase.rpc('admin_update_delivery_pricing',{
    p_enabled:input.enabled,
    p_base_fee:input.baseFee,
    p_min_fee:input.minFee,
    p_included_km:input.includedKm,
    p_per_extra_km:input.perExtraKm,
    p_per_minute:input.perMinute,
    p_road_factor:input.roadFactor,
    p_avg_speed_kmh:input.avgSpeed,
    p_max_service_km:input.maxServiceKm,
    p_max_fee:input.maxFee,
    p_round_step:input.roundStep,
  });
  if(error)throw error;
  return data;
}

export function simulateDeliveryFee(settings:any,roadKm:number){
  const speed=Math.max(5,Number(settings.delivery_avg_speed_kmh??22));
  const mins=roadKm/speed*60;
  const raw=Number(settings.delivery_base_fee??35)+Math.max(0,roadKm-Number(settings.delivery_included_km??3))*Number(settings.delivery_per_extra_km??5)+mins*Number(settings.delivery_per_minute??0.5);
  const step=Math.max(.01,Number(settings.delivery_round_step??5));
  const rounded=Math.ceil(raw/step)*step;
  return Math.max(Number(settings.delivery_min_fee??40),Math.min(Number(settings.delivery_max_fee??250),rounded));
}
