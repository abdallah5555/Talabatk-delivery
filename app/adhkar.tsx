import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { disableAdhkarReminders, enableAdhkarReminders, eveningAdhkar, getAdhkarReminderState, morningAdhkar, type Dhikr } from '@/src/lib/adhkar';

export default function Adhkar(){
  const [period,setPeriod]=useState<'morning'|'evening'>('morning');
  const [enabled,setEnabled]=useState(false);
  const [counts,setCounts]=useState<Record<number,number>>({});
  const rows=period==='morning'?morningAdhkar:eveningAdhkar;
  useEffect(()=>{void getAdhkarReminderState().then(x=>setEnabled(x.enabled));},[]);
  async function toggle(){try{if(enabled){await disableAdhkarReminders();setEnabled(false);}else{await enableAdhkarReminders();setEnabled(true);}}catch(e){Alert.alert('تعذر تحديث التذكير',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <Screen>
    <Title>الأذكار</Title>
    <Muted>مجموعة مختصرة تعمل بدون إنترنت. تقدر تفعّل تذكير صباحي ومسائي من على جهازك.</Muted>
    <Card><Button title={enabled?'إيقاف تذكير الأذكار':'تفعيل تذكير الأذكار'} onPress={toggle}/><Muted>المواعيد الافتراضية: 7:00 صباحًا و6:00 مساءً حسب وقت الجهاز.</Muted></Card>
    <View style={{flexDirection:'row-reverse',gap:8}}><View style={{flex:1}}><Button title="أذكار الصباح" onPress={()=>{setPeriod('morning');setCounts({});}}/></View><View style={{flex:1}}><Button title="أذكار المساء" onPress={()=>{setPeriod('evening');setCounts({});}}/></View></View>
    {rows.map((item,index)=><DhikrCard key={`${period}-${index}`} item={item} value={counts[index]??0} onPress={()=>setCounts(c=>({...c,[index]:Math.min(item.count,(c[index]??0)+1)}))}/>) }
  </Screen>;
}

function DhikrCard({item,value,onPress}:{item:Dhikr;value:number;onPress:()=>void}){
  const done=value>=item.count;
  return <Pressable accessibilityRole="button" onPress={onPress}><Card><Text style={{textAlign:'right',fontSize:18,lineHeight:30,fontWeight:'700'}}>{item.text}</Text><Muted>{done?'تم ✓':`العدد ${value} من ${item.count}`}</Muted></Card></Pressable>;
}
