import { supabase } from './supabase';
import { createPrivateDocumentUrl } from './onboarding';

export async function getPendingRoleApplications(){
  const [merchant,driver]=await Promise.all([
    supabase.from('merchant_applications').select('id,applicant_id,business_name,phone,address,category,logo_url,latitude,longitude,status,created_at').eq('status','pending').order('created_at'),
    supabase.from('driver_applications').select('id,applicant_id,full_name,phone,vehicle_type,transport_mode,motorcycle_type,profile_photo_url,driving_license_front_path,driving_license_back_path,vehicle_license_front_path,vehicle_license_back_path,status,created_at').eq('status','pending').order('created_at'),
  ]);
  if(merchant.error)throw merchant.error;
  if(driver.error)throw driver.error;
  return {merchant:merchant.data??[],driver:driver.data??[]};
}

export async function decideRoleApplication(kind:'merchant'|'driver',id:string,status:'approved'|'rejected'){
  const fn=kind==='merchant'?'admin_set_merchant_application':'admin_set_driver_application';
  const {data,error}=await supabase.rpc(fn,{p_id:id,p_status:status});
  if(error)throw error;
  return data;
}

export async function getPrivateApplicationDocumentUrl(path:string){return createPrivateDocumentUrl(path);}
