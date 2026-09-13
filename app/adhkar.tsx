import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Title, colors } from '@/src/components/ui';
import { disableAdhkarReminders, enableAdhkarReminders, eveningAdhkar, getAdhkarReminderState, morningAdhkar, type Dhikr } from '@/src/lib/adhkar';

export default function Adhkar(){
  const [period,setPeriod]=useState<'morning'|'evening'>('morning');
  const [enabled,setEnabled]=useState(false);
  const [interval,setIntervalMinutes]=useState(5);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [counts,setCounts]=useState<Record<number,number>>({});
  const rows=period==='morning'?morningAdhkar:eveningAdhkar;
  useEffect(()=>{void getAdhkarReminderState().then(x=>{setEnabled(x.enabled);setIntervalMinutes(x.intervalMinutes);});},[]);
  async function toggle(){
    setBusy(true);setMessage(null);
    try{
      if(enabled){await disableAdhkarReminders();setEnabled(false);setMessage('تم إيقاف تذكير الأذكار.');}
      else{await enableAdhkarReminders(interval);setEnabled(true);setMessage(`تم التفعيل: تذكير كل ${interval} ${interval===1?'دقيقة':'دقائق'}.`);}
    }catch(e){setMessage(e instanceof Error?e.message:'تعذر تحديث التذكير. حاول مرة أخرى.');}
    finally{setBusy(false);}
  }
  async function chooseInterval(value:number){
    setIntervalMinutes(value);
    if(!enabled)return;
    setBusy(true);setMessage(null);
    try{await enableAdhkarReminders(value);setMessage(`تم تعديل التذكير إلى كل ${value} ${value===1?'دقيقة':'دقائق'}.`);}catch(e){setMessage(e instanceof Error?e.message:'تعذر تعديل المدة.');}finally{setBusy(false);}
  }
  return <Screen>
    <View style={s.hero}><Text style={s.eyebrow}>ذكر على مدار يومك</Text><Text style={s.heroTitle}>الأذكار</Text><Text style={s.heroText}>فعّل تذكيرًا متكررًا واختار المدة المناسبة ليك من دقيقة لحد 15 دقيقة. الإعداد محفوظ على جهازك ويعمل مع كل أنواع الحسابات.</Text></View>
    <Card><Text style={s.sectionTitle}>مدة التذكير</Text><Muted>اختار كل كام دقيقة تحب توصلك تذكرة بسيطة.</Muted><View style={s.intervals}>{Array.from({length:15},(_,i)=>i+1).map(value=><Pressable key={value} disabled={busy} onPress={()=>void chooseInterval(value)} style={[s.intervalChip,interval===value&&s.intervalChipActive]}><Text style={[s.intervalText,interval===value&&s.intervalTextActive]}>{value}</Text></Pressable>)}</View><Button title={busy?'جاري الحفظ…':enabled?'إيقاف تذكير الأذكار':`تفعيل تذكير كل ${interval} ${interval===1?'دقيقة':'دقائق'}`} onPress={toggle} disabled={busy}/>{message?<View style={[s.notice,enabled?s.noticeOk:s.noticeNeutral]}><Text style={s.noticeText}>{message}</Text></View>:null}</Card>
    <View style={s.tabs}><Pressable onPress={()=>{setPeriod('morning');setCounts({});}} style={[s.tab,period==='morning'&&s.tabActive]}><Text style={[s.tabText,period==='morning'&&s.tabTextActive]}>أذكار الصباح</Text></Pressable><Pressable onPress={()=>{setPeriod('evening');setCounts({});}} style={[s.tab,period==='evening'&&s.tabActive]}><Text style={[s.tabText,period==='evening'&&s.tabTextActive]}>أذكار المساء</Text></Pressable></View>
    <Title>{period==='morning'?'أذكار الصباح':'أذكار المساء'}</Title>
    {rows.map((item,index)=><DhikrCard key={`${period}-${index}`} item={item} value={counts[index]??0} onPress={()=>setCounts(c=>({...c,[index]:Math.min(item.count,(c[index]??0)+1)}))}/>) }
  </Screen>;
}

function DhikrCard({item,value,onPress}:{item:Dhikr;value:number;onPress:()=>void}){
  const done=value>=item.count;
  return <Pressable accessibilityRole="button" onPress={onPress}><Card><Text style={s.dhikrText}>{item.text}</Text><View style={s.countRow}><Text style={[s.countBadge,done&&s.done]}>{done?'تم ✓':`${value} / ${item.count}`}</Text></View></Card></Pressable>;
}

const s=StyleSheet.create({hero:{backgroundColor:'#17212f',borderRadius:28,padding:22,gap:7},eyebrow:{color:'#fb923c',fontSize:12,fontWeight:'900',textAlign:'right'},heroTitle:{color:'#fff',fontSize:30,lineHeight:38,fontWeight:'900',textAlign:'right'},heroText:{color:'#e4e7ec',fontSize:14,lineHeight:24,textAlign:'right'},sectionTitle:{fontSize:18,fontWeight:'900',color:colors.text,textAlign:'right'},intervals:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},intervalChip:{width:42,height:42,borderRadius:13,borderWidth:1,borderColor:'#d0d5dd',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},intervalChipActive:{backgroundColor:colors.primarySoft,borderColor:colors.primary,borderWidth:2},intervalText:{fontWeight:'800',color:'#475467'},intervalTextActive:{color:'#b93815'},notice:{borderRadius:14,padding:12},noticeOk:{backgroundColor:'#ecfdf3'},noticeNeutral:{backgroundColor:'#f2f4f7'},noticeText:{textAlign:'right',fontWeight:'800',lineHeight:21,color:'#344054'},tabs:{flexDirection:'row-reverse',gap:8},tab:{flex:1,minHeight:48,borderRadius:15,borderWidth:1,borderColor:'#d0d5dd',alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},tabActive:{backgroundColor:'#17212f',borderColor:'#17212f'},tabText:{fontWeight:'900',color:'#475467'},tabTextActive:{color:'#fff'},dhikrText:{textAlign:'right',fontSize:18,lineHeight:32,fontWeight:'700',color:'#101828'},countRow:{flexDirection:'row-reverse'},countBadge:{backgroundColor:'#fff4ed',color:'#b93815',paddingHorizontal:10,paddingVertical:5,borderRadius:999,fontWeight:'900'},done:{backgroundColor:'#ecfdf3',color:'#067647'}});
