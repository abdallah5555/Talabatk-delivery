import { supabase } from './supabase';
import { authStorage } from './storage';

export type RegistrationKind='customer'|'merchant'|'driver';

const REAUTH_AT_KEY='talabatk_last_interactive_auth_at';
export const REAUTH_WINDOW_MS=72*60*60*1000;

async function markInteractiveAuth(){
  await authStorage.setItem(REAUTH_AT_KEY,String(Date.now()));
}

export async function requiresInteractiveReauth(){
  const value=await authStorage.getItem(REAUTH_AT_KEY);
  const timestamp=Number(value);
  if(!value||!Number.isFinite(timestamp)){
    await markInteractiveAuth();
    return false;
  }
  return Date.now()-timestamp>=REAUTH_WINDOW_MS;
}

export async function clearInteractiveAuthMarker(){
  await authStorage.removeItem(REAUTH_AT_KEY);
}

export function normalizeEgyptPhone(value:string){
  const raw=value.replace(/[\s()-]/g,'');
  if(/^\+20(10|11|12|15)\d{8}$/.test(raw)) return raw;
  if(/^0020(10|11|12|15)\d{8}$/.test(raw)) return `+${raw.slice(2)}`;
  if(/^0(10|11|12|15)\d{8}$/.test(raw)) return `+20${raw.slice(1)}`;
  if(/^(10|11|12|15)\d{8}$/.test(raw)) return `+20${raw}`;
  throw new Error('اكتب رقم موبايل مصري صحيح، مثال: 01012345678');
}

function loginEmails(phone:string){
  const normalized=normalizeEgyptPhone(phone);
  const digits=normalized.slice(1);
  const local=`0${normalized.slice(3)}`;
  return Array.from(new Set([
    `u_${digits}@talabak.internal.net`,
    `u_${local}@talabak.internal.net`,
    `${local}@talabak.app`,
    `${digits}@talabak.app`,
  ]));
}

async function assertActive(userId:string){
  const {data:profile,error}=await supabase.from('profiles').select('is_active').eq('id',userId).maybeSingle();
  if(error) throw new Error('تعذر التحقق من حالة الحساب حاليًا. حاول مرة أخرى.');
  if(profile?.is_active===false){
    await supabase.auth.signOut({scope:'local'});
    await clearInteractiveAuthMarker();
    throw new Error('الحساب موقوف حاليًا. تواصل مع الدعم.');
  }
}

export async function signInPhonePassword(phone:string,password:string){
  if(password.length<8) throw new Error('راجع رقم الهاتف وكلمة المرور.');
  const emails=loginEmails(phone);
  for(const email of emails){
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(!error&&data.user){
      await assertActive(data.user.id);
      await markInteractiveAuth();
      return data;
    }
  }
  throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة.');
}

export async function changePassword(currentPassword:string,newPassword:string){
  if(currentPassword.length<8)throw new Error('اكتب كلمة المرور الحالية بشكل صحيح.');
  if(newPassword.length<8||newPassword.length>72)throw new Error('كلمة المرور الجديدة لازم تكون من 8 إلى 72 حرفًا.');
  if(currentPassword===newPassword)throw new Error('اختار كلمة مرور جديدة مختلفة عن الحالية.');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user?.email)throw new Error('تعذر تحديد حساب تسجيل الدخول.');
  const {error:verifyError}=await supabase.auth.signInWithPassword({email:user.email,password:currentPassword});
  if(verifyError)throw new Error('كلمة المرور الحالية غير صحيحة.');
  const {error}=await supabase.auth.updateUser({password:newPassword});
  if(error)throw new Error('تعذر تغيير كلمة المرور حاليًا. حاول مرة أخرى.');
  await markInteractiveAuth();
}

export async function signUpPhonePassword(input:{name:string;phone:string;password:string;kind:RegistrationKind}){
  const name=input.name.trim();
  const normalized=normalizeEgyptPhone(input.phone);
  if(name.length<2) throw new Error('الاسم مطلوب.');
  if(input.password.length<8||input.password.length>72) throw new Error('كلمة المرور لازم تكون من 8 إلى 72 حرفًا.');

  const {data,error}=await supabase.functions.invoke('customer-signup',{body:{name,phone:normalized,password:input.password,kind:input.kind}});
  if(error){
    const status=(error as any)?.context?.status;
    if(status===409) throw new Error('رقم الهاتف مسجل بالفعل. جرّب تسجيل الدخول.');
    if(status===429) throw new Error('محاولات تسجيل كثيرة. حاول بعد فترة قصيرة.');
    throw new Error('تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.');
  }
  if(!data?.success) throw new Error('تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.');

  const email=`u_${normalized.slice(1)}@talabak.internal.net`;
  const {data:session,error:loginError}=await supabase.auth.signInWithPassword({email,password:input.password});
  if(loginError||!session.user||!session.session) throw new Error('تم إنشاء الحساب، لكن تعذر بدء الجلسة. سجل الدخول من صفحة الدخول.');
  await assertActive(session.user.id);
  await markInteractiveAuth();
  return session;
}
