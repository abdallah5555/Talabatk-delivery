import type { PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { Card, Muted, Screen, Title } from './ui';
import { supabase } from '@/src/lib/supabase';

async function getGateState(){
  const [{data:setting,error:settingError},{data:{user}}]=await Promise.all([
    supabase.from('app_settings').select('value').eq('key','maintenance_mode').maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if(settingError) throw settingError;
  let admin=false;
  if(user){const {data,error}=await supabase.from('user_roles').select('role').eq('user_id',user.id).eq('role','admin').maybeSingle();if(error) throw error;admin=Boolean(data);}
  return {maintenance:Boolean(setting?.value),admin};
}

export function AppGate({children}:PropsWithChildren){
  const gate=useQuery({queryKey:['app-gate'],queryFn:getGateState,refetchInterval:30000,retry:2});
  if(gate.isLoading) return <Screen><Muted>جاري تجهيز طلباتك…</Muted></Screen>;
  if(gate.data?.maintenance&&!gate.data.admin) return <Screen><Card><Title>بنحسّن طلباتك</Title><Text style={{textAlign:'right',fontWeight:'800'}}>الخدمة متوقفة مؤقتًا لأعمال صيانة قصيرة.</Text><Muted>حاول فتح التطبيق مرة تانية بعد قليل.</Muted></Card></Screen>;
  return <>{children}</>;
}
