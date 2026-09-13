import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Muted } from '@/src/components/ui';
import { getMyApplications } from '@/src/lib/features';

export default function Applications(){
  const query=useQuery({queryKey:['applications'],queryFn:getMyApplications});
  const merchant=query.data?.merchant?.[0];const driver=query.data?.driver?.[0];
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}><Text style={s.kicker}>انضم لمنظومة طلباتك</Text><Text style={s.heroTitle}>اختار مسارك وكمّل بياناتك</Text><Text style={s.heroText}>التاجر والمندوب لازم يكمّلوا البيانات والمستندات المطلوبة قبل إرسال الطلب للإدارة. نفس الخطوة دي بتظهر تلقائيًا لو اخترت تاجر أو مندوب وقت إنشاء الحساب لأول مرة.</Text></View>
    <Card><Text style={s.title}>🏪 حساب تاجر</Text><Muted>اسم النشاط، نوعه، العنوان، الموقع الجغرافي، صورة النشاط، بطاقة الرقم القومي وش وظهر، والسجل التجاري.</Muted>{merchant?<Status value={merchant.status}/>:null}<Button title={merchant?.status==='pending'?'طلب التاجر قيد المراجعة':'استكمال تسجيل التاجر'} onPress={()=>router.push({pathname:'/onboarding',params:{role:'merchant'}})} disabled={merchant?.status==='pending'}/></Card>
    <Card><Text style={s.title}>🛵 حساب مندوب</Text><Muted>وسيلة التوصيل، صورة شخصية، بطاقة الرقم القومي، ولو موتوسيكل: رخصة القيادة ورخصة الموتوسيكل وش وظهر.</Muted>{driver?<Status value={driver.status}/>:null}<Button title={driver?.status==='pending'?'طلب المندوب قيد المراجعة':'استكمال تسجيل المندوب'} onPress={()=>router.push({pathname:'/onboarding',params:{role:'driver'}})} disabled={driver?.status==='pending'}/></Card>
  </ScrollView>;
}
function Status({value}:{value:string}){const labels:Record<string,string>={pending:'قيد مراجعة الإدارة',approved:'تمت الموافقة',rejected:'تم الرفض'};return <View style={[s.status,value==='approved'?s.ok:value==='rejected'?s.bad:s.wait]}><Text style={s.statusText}>{labels[value]??value}</Text></View>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:40,gap:14,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22,gap:8},kicker:{color:'#fb923c',fontWeight:'900',fontSize:13,textAlign:'right'},heroTitle:{color:'#fff',fontSize:26,lineHeight:36,fontWeight:'900',textAlign:'right'},heroText:{color:'#e4e7ec',fontSize:14,lineHeight:24,textAlign:'right'},title:{fontSize:19,lineHeight:28,fontWeight:'900',textAlign:'right',color:'#101828'},status:{borderRadius:12,padding:10},wait:{backgroundColor:'#fffaeb'},ok:{backgroundColor:'#ecfdf3'},bad:{backgroundColor:'#fef3f2'},statusText:{fontWeight:'900',textAlign:'right',color:'#344054'}});
