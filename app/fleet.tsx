import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { getMyFleetDrivers, getMyFleetSummary, recordFleetDriverSettlement } from '@/src/lib/finance';

export default function Fleet(){
  const qc=useQueryClient();
  const summary=useQuery({queryKey:['fleet-summary'],queryFn:getMyFleetSummary,refetchInterval:30_000});
  const drivers=useQuery({queryKey:['fleet-drivers'],queryFn:getMyFleetDrivers,enabled:Boolean(summary.data?.fleet_id),refetchInterval:30_000});
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const totalDriverBalance=useMemo(()=>drivers.data?.reduce((sum,d)=>sum+d.balance,0)??0,[drivers.data]);

  async function settle(driverId:string){
    const amount=Number(amounts[driverId]);
    if(!Number.isFinite(amount)||amount<=0)return Alert.alert('راجع المبلغ','اكتب قيمة تسوية أكبر من صفر.');
    setBusy(driverId);
    try{await recordFleetDriverSettlement(driverId,amount,notes[driverId]??'');setAmounts(x=>({...x,[driverId]:''}));setNotes(x=>({...x,[driverId]:''}));await qc.invalidateQueries({queryKey:['fleet-drivers']});}
    catch(e){Alert.alert('تعذر تسجيل التسوية',e instanceof Error?e.message:'حاول مرة أخرى.');}
    finally{setBusy(null);}
  }

  if(summary.isLoading)return <View style={s.center}><Muted>جاري تحميل الشركة…</Muted></View>;
  if(!summary.data)return <View style={s.center}><Title>مفيش شركة مرتبطة بالحساب</Title><Muted>مدير المنصة يقدر يربط حسابك كشركة تشغيل مستقلة من لوحة الإدارة.</Muted></View>;
  const f=summary.data;
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={[s.hero,f.blocked&&s.heroBlocked]}><Text style={s.kicker}>FLEET CONTROL</Text><Text style={s.title}>{f.fleet_name}</Text><Text style={s.sub}>إدارة مناديب شركتك وحساباتهم من غير صلاحية على باقي المنصة.</Text><View style={s.metrics}><Metric label="المندوبون" value={String(f.drivers_count)}/><Metric label="محفظة الشركة" value={`${f.wallet_balance.toFixed(2)} ج`}/><Metric label="عمولة الشركة" value={`${f.driver_commission_percent.toFixed(1)}%`}/><Metric label="عمولة المنصة" value={`${f.platform_commission_percent.toFixed(1)}%`}/></View>{f.blocked?<View style={s.blocked}><Text style={s.blockedText}>الحساب وصل حد المديونية. لازم تتم تسوية المحفظة قبل استقبال عمليات جديدة.</Text></View>:null}</View>

    <Card><Text style={s.cardTitle}>حساب الشركة</Text><Muted>حد المديونية الحالي: -{f.debt_limit.toFixed(2)} ج • حالة الشركة: {f.fleet_status}</Muted><Muted>رصيد حساب المناديب الداخلي: {totalDriverBalance.toFixed(2)} ج. القيم السالبة معناها مبالغ مستحقة للشركة من المندوبين.</Muted></Card>

    <Text style={s.section}>المناديب</Text>
    {(drivers.data??[]).length===0?<Card><Muted>لسه مفيش مناديب مربوطين بالشركة. مدير المنصة يقدر يضيفهم من لوحة الإدارة.</Muted></Card>:(drivers.data??[]).map(d=><Card key={d.driver_id}><View style={s.row}><View style={s.flex}><Text style={s.driverName}>{d.full_name||'مندوب بدون اسم'}</Text><Muted>{d.phone||'بدون رقم ظاهر'}</Muted></View><View style={s.rating}><Text style={s.ratingText}>★ {d.avg_rating.toFixed(2)}</Text></View></View><View style={s.driverStats}><Stat label="طلبات 30 يوم" value={String(d.delivered_30d)}/><Stat label="عمولة المندوب" value={`${(d.commission_percent??f.driver_commission_percent).toFixed(1)}%`}/><Stat label="رصيده مع الشركة" value={`${d.balance.toFixed(2)} ج`} danger={d.balance<0}/></View><View style={s.divider}/><Text style={s.cardTitle}>تسجيل تسوية</Text><Muted>استخدمها لما المندوب يسدد جزء من المبلغ المستحق للشركة. كل حركة بتفضل محفوظة في السجل.</Muted><Field value={amounts[d.driver_id]??''} onChangeText={v=>setAmounts(x=>({...x,[d.driver_id]:v}))} keyboardType="decimal-pad" placeholder="المبلغ بالجنيه"/><Field value={notes[d.driver_id]??''} onChangeText={v=>setNotes(x=>({...x,[d.driver_id]:v}))} placeholder="ملاحظة اختيارية"/><Button title={busy===d.driver_id?'جاري الحفظ…':'تسجيل التسوية'} disabled={busy!==null} onPress={()=>void settle(d.driver_id)}/></Card>)}
  </ScrollView>;
}
function Metric({label,value}:{label:string;value:string}){return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>}
function Stat({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <View style={s.stat}><Text style={[s.statValue,danger&&s.danger]}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:13,direction:'rtl'},center:{flex:1,justifyContent:'center',padding:28,backgroundColor:'#f5f7fa',gap:8},hero:{backgroundColor:'#101828',borderRadius:30,padding:22,gap:9},heroBlocked:{backgroundColor:'#4a1d1f'},kicker:{color:'#fdba74',fontWeight:'900',textAlign:'right'},title:{fontSize:29,fontWeight:'900',color:'#fff',textAlign:'right'},sub:{color:'#d0d5dd',lineHeight:22,textAlign:'right'},metrics:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginTop:5},metric:{width:'48%',backgroundColor:'rgba(255,255,255,.08)',borderRadius:16,padding:12},metricValue:{color:'#fff',fontSize:19,fontWeight:'900',textAlign:'right'},metricLabel:{color:'#cbd5e1',fontSize:10,textAlign:'right'},blocked:{backgroundColor:'#fef3f2',borderRadius:14,padding:11,marginTop:4},blockedText:{color:'#b42318',fontWeight:'900',textAlign:'right',lineHeight:20},cardTitle:{fontSize:16,fontWeight:'900',color:'#344054',textAlign:'right'},section:{fontSize:21,fontWeight:'900',color:'#101828',textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'center',gap:10},flex:{flex:1},driverName:{fontSize:17,fontWeight:'900',color:'#101828',textAlign:'right'},rating:{backgroundColor:'#fffaeb',borderRadius:12,paddingHorizontal:9,paddingVertical:6},ratingText:{color:'#b54708',fontWeight:'900'},driverStats:{flexDirection:'row-reverse',gap:7},stat:{flex:1,backgroundColor:'#f9fafb',borderRadius:13,padding:9},statValue:{fontWeight:'900',color:'#101828',textAlign:'right'},danger:{color:colors.danger},statLabel:{fontSize:9,color:'#667085',textAlign:'right',marginTop:3},divider:{height:1,backgroundColor:'#eaecf0',marginVertical:2}});