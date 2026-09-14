import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Title, colors } from '@/src/components/ui';
import { adhkarReminderCycle, adhkarSections, disableAdhkarReminders, enableAdhkarReminders, getAdhkarReminderState, type Dhikr } from '@/src/lib/adhkar';

const intervalOptions=[1,2,3,4,5,10,15];

export default function Adhkar(){
  const [enabled,setEnabled]=useState(false);
  const [interval,setIntervalMinutes]=useState(5);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState<string|null>(null);
  const [counts,setCounts]=useState<Record<string,number>>({});
  useEffect(()=>{void getAdhkarReminderState().then(x=>{setEnabled(x.enabled);setIntervalMinutes(x.intervalMinutes);});},[]);
  async function toggle(){
    setBusy(true);setMessage(null);
    try{
      if(enabled){await disableAdhkarReminders();setEnabled(false);setMessage('تم إيقاف تذكير الأذكار.');}
      else{await enableAdhkarReminders(interval);setEnabled(true);setMessage(`تم تفعيل أذكار متنوعة بالتتابع كل ${interval} ${interval===1?'دقيقة':'دقائق'}.`);}
    }catch(e){setMessage(e instanceof Error?e.message:'تعذر تحديث التذكير. حاول مرة أخرى.');}
    finally{setBusy(false);}
  }
  async function chooseInterval(value:number){
    setIntervalMinutes(value);
    if(!enabled)return;
    setBusy(true);setMessage(null);
    try{await enableAdhkarReminders(value);setMessage(`تم تعديل التذكير إلى كل ${value} ${value===1?'دقيقة':'دقائق'}، مع تدوير الأذكار.`);}catch(e){setMessage(e instanceof Error?e.message:'تعذر تعديل المدة.');}finally{setBusy(false);}
  }
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.eyebrow}>ذكر على مدار يومك</Text><Text style={s.heroTitle}>الأذكار</Text><Text style={s.heroText}>اختار كل كام دقيقة تحب توصلك تذكرة. الإشعارات بتلف تلقائيًا على {adhkarReminderCycle.length} ذكر بدل تكرار ذكر واحد.</Text></View>
    <Card><Text style={s.sectionTitle}>وقت التذكير</Text><Muted>الوقت المحدد هو المدة المطلوبة بين التذكيرات. أندرويد ممكن يؤخر الإشعار وقت توفير البطارية أو السكون العميق، والتطبيق بيجدد الجدول تلقائيًا أول ما تفتحه.</Muted><View style={s.intervals}>{intervalOptions.map(value=><Pressable key={value} disabled={busy} onPress={()=>void chooseInterval(value)} style={[s.intervalChip,interval===value&&s.intervalChipActive]}><Text style={[s.intervalText,interval===value&&s.intervalTextActive]}>{value}</Text></Pressable>)}</View><Button title={busy?'جاري الحفظ…':enabled?'إيقاف تذكير الأذكار':`تفعيل تذكير كل ${interval} ${interval===1?'دقيقة':'دقائق'}`} onPress={toggle} disabled={busy}/>{message?<View style={[s.notice,enabled?s.noticeOk:s.noticeNeutral]}><Text style={s.noticeText}>{message}</Text></View>:null}</Card>
    {adhkarSections.map(section=><View key={section.key} style={s.sectionBlock}><Title>{section.title}</Title>{section.items.map((item,index)=>{const key=`${section.key}-${index}`;return <DhikrCard key={key} item={item} value={counts[key]??0} onPress={()=>setCounts(c=>({...c,[key]:Math.min(item.count,(c[key]??0)+1)}))}/>})}</View>)}
  </ScrollView>;
}

function DhikrCard({item,value,onPress}:{item:Dhikr;value:number;onPress:()=>void}){
  const done=value>=item.count;
  return <Pressable accessibilityRole="button" onPress={onPress}><Card><Text style={s.dhikrText}>{item.text}</Text>{item.note?<Muted>{item.note}</Muted>:null}<View style={s.countRow}><Text style={[s.countBadge,done&&s.done]}>{done?'تم ✓':`${value} / ${item.count}`}</Text></View></Card></Pressable>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:14,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:28,padding:22,gap:7},eyebrow:{color:'#fb923c',fontSize:12,fontWeight:'900',textAlign:'right'},heroTitle:{color:'#fff',fontSize:30,lineHeight:38,fontWeight:'900',textAlign:'right'},heroText:{color:'#e4e7ec',fontSize:14,lineHeight:24,textAlign:'right'},sectionTitle:{fontSize:18,fontWeight:'900',color:colors.text,textAlign:'right'},intervals:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},intervalChip:{minWidth:44,height:44,paddingHorizontal:12,borderRadius:14,borderWidth:1,borderColor:'#d0d5dd',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},intervalChipActive:{backgroundColor:colors.primarySoft,borderColor:colors.primary,borderWidth:2},intervalText:{fontWeight:'900',color:'#475467'},intervalTextActive:{color:'#b93815'},notice:{borderRadius:14,padding:12},noticeOk:{backgroundColor:'#ecfdf3'},noticeNeutral:{backgroundColor:'#f2f4f7'},noticeText:{textAlign:'right',fontWeight:'800',lineHeight:21,color:'#344054'},sectionBlock:{gap:10},dhikrText:{textAlign:'right',fontSize:18,lineHeight:32,fontWeight:'700',color:'#101828'},countRow:{flexDirection:'row-reverse'},countBadge:{backgroundColor:'#fff4ed',color:'#b93815',paddingHorizontal:10,paddingVertical:5,borderRadius:999,fontWeight:'900'},done:{backgroundColor:'#ecfdf3',color:'#067647'}});
