import { supabase } from './supabase';

export function normalizeEgyptPhone(value:string){
  const raw=value.replace(/[\s()-]/g,'');
  if(/^\+20(10|11|12|15)\d{8}$/.test(raw)) return raw;
  if(/^0020(10|11|12|15)\d{8}$/.test(raw)) return `+${raw.slice(2)}`;
  if(/^0(10|11|12|15)\d{8}$/.test(raw)) return `+20${raw.slice(1)}`;
  if(/^(10|11|12|15)\d{8}$/.test(raw)) return `+20${raw}`;
  throw new Error('اكتب رقم موبايل مصري صحيح، مثال: 01012345678');
}

export async function signInPhonePassword(phone:string,password:string){
  const normalized=normalizeEgyptPhone(phone);
  const {data,error}=await supabase.auth.signInWithPassword({phone:normalized,password});
  if(error) throw error;
  if(!data.user) throw new Error('تعذر تسجيل الدخول.');
  const {data:profile,error:profileError}=await supabase.from('profiles').select('is_active').eq('id',data.user.id).maybeSingle();
  if(profileError) throw profileError;
  if(profile?.is_active===false){await supabase.auth.signOut();throw new Error('الحساب موقوف حاليًا. تواصل مع الدعم.');}
  return data;
}

export async function signUpPhonePassword(input:{name:string;phone:string;password:string}){
  if(!input.name.trim()) throw new Error('الاسم مطلوب.');
  if(input.password.length<8) throw new Error('كلمة المرور لازم تكون 8 أحرف على الأقل.');
  const normalized=normalizeEgyptPhone(input.phone);
  const {data,error}=await supabase.auth.signUp({phone:normalized,password:input.password,options:{data:{full_name:input.name.trim()}}});
  if(error) throw error;
  if(!data.session){
    throw new Error('إعداد تأكيد الهاتف في الخادم يمنع الدخول المباشر. يلزم تعطيل تأكيد الهاتف لتشغيل التسجيل بدون SMS.');
  }
  return data;
}
