import type { PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Card, Muted, Screen, Title, colors } from './ui';
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

function LoadingBrand(){
  return <View style={s.loading}>
    <View style={s.mark}><Text style={s.markText}>ط</Text></View>
    <Text style={s.brand}>طلباتك دليفري</Text>
    <Text style={s.tagline}>كل اللي محتاجه أقرب ليك</Text>
    <ActivityIndicator size="large" color={colors.primary}/>
    <Text style={s.loadingText}>جاري تجهيز تجربتك…</Text>
  </View>;
}

export function AppGate({children}:PropsWithChildren){
  const gate=useQuery({queryKey:['app-gate'],queryFn:getGateState,refetchInterval:30000,retry:2});
  if(gate.isLoading) return <LoadingBrand/>;
  if(gate.data?.maintenance&&!gate.data.admin) return <Screen><Card><Title>بنحسّن طلباتك</Title><Text style={{textAlign:'right',fontWeight:'800'}}>الخدمة متوقفة مؤقتًا لأعمال صيانة قصيرة.</Text><Muted>حاول فتح التطبيق مرة تانية بعد قليل.</Muted></Card></Screen>;
  return <>{children}</>;
}

const s=StyleSheet.create({
  loading:{flex:1,backgroundColor:'#fff7ed',alignItems:'center',justifyContent:'center',padding:28,gap:12},
  mark:{width:92,height:92,borderRadius:28,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',shadowColor:'#e85d0f',shadowOpacity:.22,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:5},
  markText:{fontSize:50,fontWeight:'900',color:'#fff'},
  brand:{fontSize:30,fontWeight:'900',color:colors.dark,textAlign:'center'},
  tagline:{fontSize:15,fontWeight:'700',color:colors.muted,textAlign:'center',marginBottom:12},
  loadingText:{fontSize:13,fontWeight:'700',color:colors.muted,textAlign:'center'},
});
