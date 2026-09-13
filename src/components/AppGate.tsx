import type { PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Card, Muted, Screen, Title, colors } from './ui';
import { supabase } from '@/src/lib/supabase';

async function getMaintenanceState(){
  const {data:setting,error}=await supabase
    .from('app_settings')
    .select('value')
    .eq('key','maintenance_mode')
    .maybeSingle();
  if(error) throw error;
  const maintenance=Boolean(setting?.value);
  if(!maintenance) return {maintenance:false,admin:false};

  // Only resolve the current role when maintenance is actually enabled.
  // This avoids extra auth + role network round-trips on every normal startup.
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.user?.id) return {maintenance:true,admin:false};
  const {data,error:roleError}=await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id',session.user.id)
    .eq('role','admin')
    .maybeSingle();
  if(roleError) throw roleError;
  return {maintenance:true,admin:Boolean(data)};
}

function LoadingBrand(){
  return <View style={s.loading}>
    <View style={s.logoWrap}><Image source={require('../../assets/app-icon.png')} style={s.logo} resizeMode="contain"/></View>
    <Text style={s.brand}>طلباتك دليفري</Text>
    <Text style={s.tagline}>كل اللي محتاجه أقرب ليك</Text>
    <ActivityIndicator size="large" color={colors.primary}/>
    <Text style={s.loadingText}>جاري تجهيز تجربتك…</Text>
  </View>;
}

export function AppGate({children}:PropsWithChildren){
  const gate=useQuery({
    queryKey:['app-gate'],
    queryFn:getMaintenanceState,
    staleTime:5*60*1000,
    refetchInterval:5*60*1000,
    retry:1,
    retryDelay:500,
  });

  // A maintenance check must never hold a healthy app on a loading screen.
  // The query keeps running in the background and will replace the UI only
  // when maintenance mode is positively confirmed.
  if(gate.data?.maintenance&&!gate.data.admin) return <Screen><Card><Title>بنحسّن طلباتك</Title><Text style={{textAlign:'right',fontWeight:'800'}}>الخدمة متوقفة مؤقتًا لأعمال صيانة قصيرة.</Text><Muted>حاول فتح التطبيق مرة تانية بعد قليل.</Muted></Card></Screen>;
  return <>{children}</>;
}

export { LoadingBrand };

const s=StyleSheet.create({
  loading:{flex:1,backgroundColor:'#f8f9fa',alignItems:'center',justifyContent:'center',padding:28,gap:12},
  logoWrap:{width:150,height:150,borderRadius:38,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',shadowColor:'#101828',shadowOpacity:.08,shadowRadius:18,shadowOffset:{width:0,height:8},elevation:5},
  logo:{width:132,height:132},
  brand:{fontSize:30,fontWeight:'900',color:colors.dark,textAlign:'center'},
  tagline:{fontSize:15,fontWeight:'700',color:colors.muted,textAlign:'center',marginBottom:12},
  loadingText:{fontSize:13,fontWeight:'700',color:colors.muted,textAlign:'center'},
});
