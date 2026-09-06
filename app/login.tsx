import { useState } from 'react';
import { Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ phone: phone.trim(), password });
    setBusy(false);
    if (error) return Alert.alert('تعذر تسجيل الدخول', error.message);
    router.replace('/home');
  }

  return <Screen><Card><Title>طلباتك أقرب ليك</Title><Muted>اطلب بسهولة وتابع طلبك خطوة بخطوة من مكانك.</Muted><Field accessibilityLabel="رقم الهاتف" keyboardType="phone-pad" placeholder="رقم الهاتف" value={phone} onChangeText={setPhone} /><Field accessibilityLabel="كلمة المرور" placeholder="كلمة المرور" secureTextEntry value={password} onChangeText={setPassword} /><Button title={busy ? 'جاري الدخول…' : 'دخول'} onPress={submit} disabled={busy || !phone || password.length < 6} /><Link href="/signup" style={{ textAlign: 'center' }}>إنشاء حساب جديد</Link></Card></Screen>;
}
