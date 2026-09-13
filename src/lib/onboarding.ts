import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from './supabase';

function derivePhone(user:{email?:string|null;user_metadata?:Record<string,unknown>}){
  const metadata=typeof user.user_metadata?.phone==='string'?user.user_metadata.phone.trim():'';
  if(metadata)return metadata;
  const match=(user.email??'').match(/^u_(20\d+)@talabak\.internal\.net$/);
  return match?`+${match[1]}`:null;
}

async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا.');
  return user;
}

export async function getOnboardingIdentity() {
  const user = await currentUser();
  const { data:rpcData, error:rpcError } = await supabase.rpc('get_my_profile_summary');
  if(rpcError) throw rpcError;
  const data=Array.isArray(rpcData)?rpcData[0]:rpcData;
  const fallbackName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';
  const fallbackPhone=derivePhone(user);
  const fullName=(typeof data?.full_name==='string'?data.full_name.trim():'')||fallbackName||fallbackPhone||'حساب طلباتك';
  const phone=(typeof data?.phone==='string'?data.phone.trim():'')||fallbackPhone;
  return {id:data?.id??user.id,full_name:fullName,phone,avatar_url:data?.avatar_url??null};
}

function safeExt(asset: ImagePickerAsset) {
  const mime = asset.mimeType ?? '';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

async function assetBuffer(asset: ImagePickerAsset): Promise<ArrayBuffer> {
  if (Platform.OS === 'web' && asset.file) return asset.file.arrayBuffer();
  return new ExpoFile(asset.uri).arrayBuffer();
}

export async function uploadOnboardingImage(asset: ImagePickerAsset, kind: string, isPublic: boolean) {
  const user = await currentUser();
  if ((asset.fileSize ?? 0) > 6 * 1024 * 1024) throw new Error('حجم الصورة لازم يكون أقل من 6 ميجابايت.');
  const ext = safeExt(asset);
  const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
  const bucket = isPublic ? 'public-media' : 'onboarding-documents';
  const body = await assetBuffer(asset);
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: asset.mimeType ?? 'image/jpeg',
    cacheControl: isPublic ? '86400' : '0',
    upsert: false,
  });
  if (error) throw error;
  if (!isPublic) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function submitMerchantOnboarding(input: {
  businessName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  logoUrl: string;
  nationalIdFrontPath: string;
  nationalIdBackPath: string;
  commercialRegistrationPath: string;
  taxCardPath?: string | null;
}) {
  const profile=await getOnboardingIdentity();
  if(!profile.phone)throw new Error('تعذر ربط رقم الهاتف بالحساب. سجّل خروج ثم دخول مرة واحدة وحاول تاني.');
  const { data, error } = await supabase.rpc('submit_merchant_application',{
    p_business_name:input.businessName.trim(),
    p_category:input.category.trim(),
    p_address:input.address.trim(),
    p_latitude:input.latitude,
    p_longitude:input.longitude,
    p_logo_url:input.logoUrl,
    p_national_id_front_path:input.nationalIdFrontPath,
    p_national_id_back_path:input.nationalIdBackPath,
    p_commercial_registration_path:input.commercialRegistrationPath,
    p_tax_card_path:input.taxCardPath??null,
  });
  if(error)throw new Error(error.message||'تعذر إرسال طلب التاجر.');
  return data;
}

export async function submitDriverOnboarding(input: {
  transportMode: 'motorcycle' | 'bicycle';
  motorcycleType?: string;
  profilePhotoUrl: string;
  nationalIdFrontPath: string;
  nationalIdBackPath: string;
  drivingLicenseFrontPath?: string | null;
  drivingLicenseBackPath?: string | null;
  vehicleLicenseFrontPath?: string | null;
  vehicleLicenseBackPath?: string | null;
  policeClearancePath?: string | null;
}) {
  const profile=await getOnboardingIdentity();
  if(!profile.phone)throw new Error('تعذر ربط رقم الهاتف بالحساب. سجّل خروج ثم دخول مرة واحدة وحاول تاني.');
  const { data, error } = await supabase.rpc('submit_driver_application',{
    p_transport_mode:input.transportMode,
    p_motorcycle_type:input.motorcycleType??'',
    p_profile_photo_url:input.profilePhotoUrl,
    p_national_id_front_path:input.nationalIdFrontPath,
    p_national_id_back_path:input.nationalIdBackPath,
    p_driving_license_front_path:input.drivingLicenseFrontPath??null,
    p_driving_license_back_path:input.drivingLicenseBackPath??null,
    p_vehicle_license_front_path:input.vehicleLicenseFrontPath??null,
    p_vehicle_license_back_path:input.vehicleLicenseBackPath??null,
    p_police_clearance_path:input.policeClearancePath??null,
  });
  if(error)throw new Error(error.message||'تعذر إرسال طلب المندوب.');
  return data;
}

export async function createPrivateDocumentUrl(path: string) {
  const { data, error } = await supabase.storage.from('onboarding-documents').createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}
