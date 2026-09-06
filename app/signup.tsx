import { useState } from 'react';
import { Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { signUpPhonePassword } from '@/src/lib/auth';

export default function Signup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try { await signUpPhonePassword({name,phone,password}); router.replace('/home'); }
    catch(e){ Alert.alert('تعذر إنشاء الحساب',e instanceof Error?e.message:'راجع البيانات وحاول مرة أخرى'); }
    finally { setBusy(false); }
  }

  return <Screen><Card><Title>ابدأ مع طلباتك</Title><Muted>سجل بياناتك وابدأ تصفح المتاجر والخدمات المتاحة حولك.</Muted><Field accessibilityLabel="الاسم" placeholder="الاسم" value={name} onChangeText={setName} /><Field accessibilityLabel="رقم الهاتف" keyboardType="phone-pad" placeholder="رقم الهاتف" value={phone} onChangeText={setPhone} /><Field accessibilityLabel="كلمة المرور" placeholder="كلمة المرور - 8 أحرف على الأقل" secureTextEntry value={password} onChangeText={setPassword} /><Button title={busy ? 'جاري الإنشاء…' : 'إنشاء الحساب'} onPress={submit} disabled={busy || !name || !phone || password.length < 8} /><Link href="/login" style={{ textAlign: 'center' }}>عندي حساب بالفعل</Link></Card></Screen>;
}
