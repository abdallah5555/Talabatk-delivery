import { Redirect } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { useAuth } from '@/src/providers/AppProviders';
import { getLandingRoute } from '@/src/lib/landing';

export default function Index(){
  const {session,loading}=useAuth();
  const landing=useQuery({queryKey:['landing-route',session?.user?.id],queryFn:getLandingRoute,enabled:!!session?.user?.id,retry:2});
  if(loading||landing.isLoading)return <Screen><ActivityIndicator/></Screen>;
  if(!session)return <Redirect href="/login"/>;
  if(landing.isError)return <Screen><Card><Title>تعذر التحقق من صلاحية الحساب</Title><Muted>مش هنفتح أي لوحة قبل ما نتأكد من حالة الحساب والاعتماد.</Muted><Text style={{textAlign:'right',color:'#b42318'}}>{landing.error instanceof Error?landing.error.message:'حاول مرة أخرى'}</Text><Button title="إعادة المحاولة" onPress={()=>void landing.refetch()}/></Card></Screen>;
  return <Redirect href={landing.data??'/home'}/>;
}
