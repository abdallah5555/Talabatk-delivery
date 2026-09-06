import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { createOrder } from '@/src/lib/api';
import { getAddresses } from '@/src/lib/features';
import { useCart } from '@/src/state/cart';

type PaymentMethod='cash'|'merchant_paid_online';
type SchedulePreset='now'|'1h'|'2h';
function requestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
function futureIso(hours:number){return new Date(Date.now()+hours*60*60*1000).toISOString();}

export default function Checkout() {
  const cart = useCart();
  const addresses=useQuery({queryKey:['addresses'],queryFn:getAddresses});
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod,setPaymentMethod]=useState<PaymentMethod>('cash');
  const [schedulePreset,setSchedulePreset]=useState<SchedulePreset>('now');
  const [scheduledFor,setScheduledFor]=useState<string|null>(null);
  const [busy, setBusy] = useState(false);
  const attemptIds = useRef<Record<string,string>>({});
  const groups=cart.storeIds.map(storeId=>({storeId,lines:cart.lines.filter(x=>x.item.store_id===storeId)}));

  function selectSchedule(preset:SchedulePreset){
    setSchedulePreset(preset);
    setScheduledFor(preset==='now'?null:futureIso(preset==='1h'?1:2));
  }

  async function submit() {
    if (groups.length === 0) return;
    setBusy(true);
    try {
      for(const group of groups){
        const id=attemptIds.current[group.storeId] ?? requestId();
        attemptIds.current[group.storeId]=id;
        await createOrder({storeId:group.storeId,items:group.lines.map(x=>({id:x.item.id,quantity:x.quantity})),address:address.trim(),note:note.trim()||undefined,requestId:id,paymentMethod,scheduledFor});
      }
      cart.clear();
      const scheduledMessage=scheduledFor?` موعد التنفيذ: ${new Date(scheduledFor).toLocaleString('ar-EG')}.`:'';
      Alert.alert('تم إرسال الطلب', (groups.length>1?`تم تقسيم السلة إلى ${groups.length} طلبات حسب المتاجر، وكل طلب بيتابع بشكل مستقل.`:'هنفضل معاك لحد ما طلبك يوصل.')+scheduledMessage);
      router.replace('/orders');
    } catch (error) {
      Alert.alert('تعذر تأكيد كل الطلبات', 'يمكنك إعادة المحاولة بأمان؛ كل متجر له رقم محاولة ثابت ولن ننشئ طلبًا مكررًا لما نجح بالفعل.\n\n' + (error instanceof Error ? error.message : 'حاول مرة أخرى'));
    } finally { setBusy(false); }
  }

  return <Screen>
    <Title>تأكيد الطلب</Title>
    {groups.map((group,index)=><Card key={group.storeId}><Text style={{fontWeight:'900',textAlign:'right'}}>متجر {index+1}</Text>{group.lines.map((x) => <View key={x.item.id} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><Text>{x.item.name} × {x.quantity}</Text><Text>{(x.item.price * x.quantity).toFixed(2)} ج</Text></View>)}</Card>)}
    <Muted>{groups.length>1?'السلة فيها أكتر من متجر؛ هننشئ طلب منفصل وآمن لكل متجر. ':''}الخادم يعيد حساب الأسعار ورسوم التوصيل لكل متجر قبل الحفظ.</Muted>
    {(addresses.data??[]).length ? <><Muted>اختار عنوان محفوظ أو اكتب عنوان جديد</Muted><View style={{gap:8}}>{(addresses.data??[]).slice(0,5).map((a:any)=><Pressable accessibilityRole="button" key={a.id} onPress={()=>setAddress(a.address_line)}><Card><Text style={{textAlign:'right',fontWeight:'800'}}>{a.label}{a.is_default?' • الافتراضي':''}</Text><Muted>{a.address_line}</Muted></Card></Pressable>)}</View></> : null}
    <Field accessibilityLabel="عنوان التوصيل" placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} />
    <Field accessibilityLabel="ملاحظات الطلب" placeholder="ملاحظات اختيارية" value={note} onChangeText={setNote} />
    <Title>موعد الطلب</Title>
    <View style={{gap:8}}><Button title={schedulePreset==='now'?'✓ في أقرب وقت':'في أقرب وقت'} onPress={()=>selectSchedule('now')}/><Button title={schedulePreset==='1h'?'✓ بعد ساعة تقريبًا':'بعد ساعة'} onPress={()=>selectSchedule('1h')}/><Button title={schedulePreset==='2h'?'✓ بعد ساعتين تقريبًا':'بعد ساعتين'} onPress={()=>selectSchedule('2h')}/></View>
    <Muted>السيرفر يرفض أي موعد أقل من 15 دقيقة أو أبعد من 7 أيام.</Muted>
    <Title>طريقة الدفع</Title>
    <View style={{gap:8}}><Button title={paymentMethod==='cash'?'✓ كاش عند الاستلام':'كاش عند الاستلام'} onPress={()=>setPaymentMethod('cash')}/><Button title={paymentMethod==='merchant_paid_online'?'✓ مدفوع للتاجر أونلاين':'مدفوع للتاجر أونلاين'} onPress={()=>setPaymentMethod('merchant_paid_online')}/></View>
    <Muted>الخيار الأونلاين يسجل أن الدفع تم مباشرة للتاجر؛ التطبيق لا ينفذ بوابة دفع أو خصم إلكتروني.</Muted>
    <Button title={busy ? 'جاري تأكيد الطلبات…' : groups.length>1?`تأكيد ${groups.length} طلبات`:'تأكيد الطلب'} disabled={busy || address.trim().length < 5 || cart.lines.length === 0} onPress={submit} />
  </Screen>;
}
