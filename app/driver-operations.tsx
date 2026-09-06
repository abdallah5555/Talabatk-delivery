import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getDriverEarnings, getDriverIssues, getDriverReviews, submitDriverIssue } from '@/src/lib/driverOps';

const categoryLabels = { wrong_address:'العنوان غير صحيح', customer_unavailable:'العميل غير متاح', merchant_delay:'تأخير من التاجر', vehicle_route:'مشكلة مركبة/طريق', other:'أخرى' } as const;
type Category = keyof typeof categoryLabels;

export default function DriverOperations() {
  const qc=useQueryClient();
  const earnings=useQuery({queryKey:['driver-earnings'],queryFn:getDriverEarnings});
  const reviews=useQuery({queryKey:['driver-reviews'],queryFn:getDriverReviews});
  const issues=useQuery({queryKey:['driver-issues'],queryFn:getDriverIssues});
  const [category,setCategory]=useState<Category>('other'); const [orderId,setOrderId]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  async function send(){setBusy(true);try{await submitDriverIssue({orderId:orderId.trim()||null,category,message});setOrderId('');setMessage('');await qc.invalidateQueries({queryKey:['driver-issues']});Alert.alert('تم','تم إرسال البلاغ للإدارة.');}catch(e){Alert.alert('تعذر الإرسال',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  return <Screen>
    <Title>أرباح المندوب</Title><Card><Text style={{textAlign:'right',fontWeight:'900',fontSize:22}}>{(earnings.data?.today??0).toFixed(2)} ج اليوم</Text><Muted>7 أيام: {(earnings.data?.week??0).toFixed(2)} ج • 30 يوم: {(earnings.data?.month??0).toFixed(2)} ج</Muted><Muted>إجمالي السجل: {(earnings.data?.total??0).toFixed(2)} ج — عمولة المنصة الحالية 0%.</Muted></Card>
    <Title>تقييماتي</Title><Card><Text style={{textAlign:'right',fontWeight:'900'}}>{reviews.data?.average==null?'لا توجد تقييمات بعد':`${reviews.data.average.toFixed(1)} / 5`}</Text><Muted>{reviews.data?.rows.length??0} تقييم</Muted></Card>
    {(reviews.data?.rows??[]).slice(0,10).map((r:any)=><Card key={r.id}><Text style={{textAlign:'right'}}>{'★'.repeat(Number(r.rating))}{'☆'.repeat(5-Number(r.rating))}</Text><Muted>{r.comment||'بدون تعليق'}</Muted></Card>)}
    <Title>إبلاغ عن مشكلة</Title><Card><Muted>نوع المشكلة: {categoryLabels[category]}</Muted><View style={{gap:6}}>{(Object.keys(categoryLabels) as Category[]).map(k=><Button key={k} title={categoryLabels[k]} onPress={()=>setCategory(k)}/>)}</View><Field value={orderId} onChangeText={setOrderId} placeholder="رقم الطلب UUID اختياري"/><Field value={message} onChangeText={setMessage} placeholder="تفاصيل المشكلة" multiline/><Button title={busy?'جاري الإرسال…':'إرسال البلاغ'} disabled={busy||!message.trim()} onPress={send}/></Card>
    <Title>بلاغاتي</Title>{(issues.data??[]).map((i:any)=><Card key={i.id}><Text style={{fontWeight:'900',textAlign:'right'}}>{categoryLabels[i.category as Category]??i.category} • {i.status}</Text><Muted>{i.message}</Muted>{i.admin_note?<Muted>رد الإدارة: {i.admin_note}</Muted>:null}</Card>)}
  </Screen>;
}
