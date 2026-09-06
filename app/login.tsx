import { useState } from 'react';
import { Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { signInPhonePassword } from '@/src/lib/auth';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try { await signInPhonePassword(phone,password); router.replace('/home'); }
    catch(e){ Alert.alert('تعذر تسجيل الدخول',e instanceof Error?e.message:'راجع بياناتك وحاول مرة أخرى'); }
    finally { setBusy(false); }
  }

  return <Screen><Card><Title>طلباتك أقرب ليك</Title><Muted>اطلب بسهولة وتابع طلبك خطوة بخطوة من مكانك.</Muted><Field accessibilityLabel="رقم الهاتف" keyboardType="phone-pad" placeholder="رقم الهاتف" value={phone} onChangeText={setPhone} /><Field accessibilityLabel="كلمة المرور" placeholder="كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} /><Button title={busy ? 'جاري الدخول…' : 'دخول'} onPress={submit} disabled={busy || !phone || password.length < 6} /><Link href="/signup" style={{ textAlign: 'center' }}>إنشاء حساب جديد</Link></Card></Screen>;
}
