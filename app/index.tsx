import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AppProviders';
import { getLandingRoute } from '@/src/lib/landing';
import { supabase } from '@/src/lib/supabase';

export default function Index(){
  const {session,loading}=useAuth();
  const landing=useQuery({queryKey:['landing-route',session?.user?.id],queryFn:getLandingRoute,enabled:!!session?.user?.id,retry:2});
  if(loading||landing.isLoading)return <Screen><ActivityIndicator size="large"/><Muted>جاري تجهيز حسابك…</Muted></Screen>;
  if(!session)return <Redirect href="/login"/>;
  if(landing.isError)return <Screen><Card><Title>تعذر تجهيز حسابك</Title><Muted>تم تسجيل الدخول بنجاح، لكن تعذر تحميل صلاحيات الحساب الآن. يمكنك إعادة المحاولة أو الدخول بحساب آخر.</Muted><Text style={s.help}>تأكد من اتصال الإنترنت. لن نطلب موافقة الإدارة لحساب العميل.</Text><Button title="إعادة المحاولة" onPress={()=>void landing.refetch()}/><Button title="تسجيل الدخول بحساب آخر" onPress={()=>void supabase.auth.signOut().then(()=>router.replace('/login'))}/><Button title="الرجوع لتسجيل الدخول" onPress={()=>router.replace('/login')}/></Card></Screen>;
  return <Redirect href={landing.data??'/home'}/>;
}

const s=StyleSheet.create({help:{textAlign:'right',color:'#b42318',fontWeight:'700',lineHeight:21}});
