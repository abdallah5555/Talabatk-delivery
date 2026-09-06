import { Platform } from 'react-native';
import { supabase } from './supabase';

export type AdPlacementKey='home_top'|'home_feed'|'store_bottom';
export type AdProvider='direct'|'google'|'other';
export type AdPlacement={
  id:string;placement_key:AdPlacementKey;title:string;description?:string|null;enabled:boolean;provider:AdProvider;platform:'all'|'android'|'ios'|'web';media_url?:string|null;target_url?:string|null;google_ad_unit_id?:string|null;other_provider_config?:Record<string,unknown>|null;priority:number;starts_at?:string|null;ends_at?:string|null;
};

function currentPlatform(){return Platform.OS==='android'?'android':Platform.OS==='ios'?'ios':'web';}

export async function getActiveAds(){
  const {data,error}=await supabase.rpc('get_active_ad_placements',{p_platform:currentPlatform()});
  if(error) throw error;
  return (data??[]) as AdPlacement[];
}

export function pickAd(rows:AdPlacement[]|undefined,key:AdPlacementKey){return rows?.find(x=>x.placement_key===key)??null;}
