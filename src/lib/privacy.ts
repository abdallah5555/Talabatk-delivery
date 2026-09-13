import { supabase } from './supabase';

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول أولًا');
  return user.id;
}

export async function getMyProfile() {
  const id = await currentUserId();
  const { data, error } = await supabase.from('profiles').select('id,full_name,phone,avatar_url,is_active,created_at,updated_at').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(input: { fullName: string }) {
  if (!input.fullName.trim()) throw new Error('الاسم مطلوب');
  const {data,error}=await supabase.rpc('update_my_profile_name',{p_full_name:input.fullName.trim()});
  if(error)throw new Error(error.message||'تعذر تحديث بيانات الحساب');
  return data;
}

export async function getDeletionRequests() {
  const id = await currentUserId();
  const { data, error } = await supabase.from('deletion_requests').select('id,status,reason,created_at,resolved_at,admin_note').eq('user_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function requestAccountDeletion(reason = '') {
  const id = await currentUserId();
  const { data: existing, error: existingError } = await supabase.from('deletion_requests').select('id').eq('user_id', id).in('status', ['pending','processing']).maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error('يوجد طلب حذف قيد المراجعة بالفعل.');
  const { data, error } = await supabase.from('deletion_requests').insert({ user_id: id, reason: reason.trim() }).select().single();
  if (error) throw error;
  return data;
}
