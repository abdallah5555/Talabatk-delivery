import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from './supabase';

async function currentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا.');
  return user;
}

export async function getOnboardingIdentity() {
  const user = await currentUser();
  const { data, error } = await supabase.from('profiles').select('id,full_name,phone,avatar_url').eq('id', user.id).single();
  if (error) throw error;
  return data;
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
}) {
  const user = await currentUser();
  const profile = await getOnboardingIdentity();
  if (!profile.phone) throw new Error('رقم الهاتف غير موجود في الحساب.');
  const { data: pending } = await supabase.from('merchant_applications').select('id').eq('applicant_id', user.id).eq('status', 'pending').maybeSingle();
  if (pending) throw new Error('عندك طلب تاجر قيد المراجعة بالفعل.');
  const { data, error } = await supabase.from('merchant_applications').insert({
    applicant_id: user.id,
    business_name: input.businessName.trim(),
    phone: profile.phone,
    address: input.address.trim(),
    category: input.category.trim() || 'أخرى',
    logo_url: input.logoUrl,
    latitude: input.latitude,
    longitude: input.longitude,
    status: 'pending',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function submitDriverOnboarding(input: {
  transportMode: 'motorcycle' | 'bicycle';
  motorcycleType?: string;
  profilePhotoUrl: string;
  drivingLicenseFrontPath?: string | null;
  drivingLicenseBackPath?: string | null;
  vehicleLicenseFrontPath?: string | null;
  vehicleLicenseBackPath?: string | null;
}) {
  const user = await currentUser();
  const profile = await getOnboardingIdentity();
  if (!profile.phone) throw new Error('رقم الهاتف غير موجود في الحساب.');
  if (input.transportMode === 'motorcycle') {
    if (!input.motorcycleType?.trim()) throw new Error('اكتب نوع/موديل الموتوسيكل.');
    if (!input.drivingLicenseFrontPath || !input.drivingLicenseBackPath || !input.vehicleLicenseFrontPath || !input.vehicleLicenseBackPath) throw new Error('صور رخصة القيادة والموتوسيكل وش وظهر مطلوبة.');
  }
  const { data: pending } = await supabase.from('driver_applications').select('id').eq('applicant_id', user.id).eq('status', 'pending').maybeSingle();
  if (pending) throw new Error('عندك طلب مندوب قيد المراجعة بالفعل.');
  const vehicleType = input.transportMode === 'bicycle' ? 'دراجة' : input.motorcycleType!.trim();
  const { data, error } = await supabase.from('driver_applications').insert({
    applicant_id: user.id,
    full_name: profile.full_name,
    phone: profile.phone,
    vehicle_type: vehicleType,
    transport_mode: input.transportMode,
    motorcycle_type: input.transportMode === 'motorcycle' ? input.motorcycleType!.trim() : null,
    profile_photo_url: input.profilePhotoUrl,
    driving_license_front_path: input.drivingLicenseFrontPath ?? null,
    driving_license_back_path: input.drivingLicenseBackPath ?? null,
    vehicle_license_front_path: input.vehicleLicenseFrontPath ?? null,
    vehicle_license_back_path: input.vehicleLicenseBackPath ?? null,
    status: 'pending',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function createPrivateDocumentUrl(path: string) {
  const { data, error } = await supabase.storage.from('onboarding-documents').createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}
