import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Field, Muted, PasswordField, Title, colors } from '@/src/components/ui';
import { signInPhonePassword } from '@/src/lib/auth';
import { getLandingRoute } from '@/src/lib/landing';

export default function Login() {
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(){setBusy(true);try{await signInPhonePassword(phone,password);router.replace(await getLandingRoute());}catch(e){Alert.alert('تعذر تسجيل الدخول',e instanceof Error?e.message:'راجع رقم الموبايل وكلمة المرور وحاول مرة أخرى');}finally{setBusy(false);}}
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.brand}>طلباتك دليفري</Text><Text style={s.heroTitle}>أهلاً برجوعك</Text><Text style={s.heroText}>سجّل دخولك وكمل من المكان المناسب لحسابك مباشرة.</Text></View>
    <Card><Title>تسجيل الدخول</Title><Muted>استخدم رقم الموبايل وكلمة المرور الخاصة بحسابك.</Muted><Field accessibilityLabel="رقم الهاتف" keyboardType="phone-pad" placeholder="رقم الموبايل" value={phone} onChangeText={setPhone}/><PasswordField accessibilityLabel="كلمة المرور" placeholder="كلمة المرور" value={password} onChangeText={setPassword}/><Button title={busy?'جاري الدخول…':'دخول'} onPress={submit} disabled={busy||!phone.trim()||password.length<8}/></Card>
    <Link href="/signup" style={s.link}>مستخدم جديد؟ أنشئ حسابك</Link>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f6f7f9'},content:{padding:18,paddingTop:42,paddingBottom:36,gap:16,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:26,gap:9},brand:{color:'#fb923c',fontSize:17,fontWeight:'900',textAlign:'right'},heroTitle:{color:'#fff',fontSize:30,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:14,lineHeight:23,textAlign:'right'},link:{textAlign:'center',color:colors.primary,fontWeight:'800',paddingVertical:10}});
