import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { createOrder } from '@/src/lib/api';
import { getAddresses } from '@/src/lib/features';
import { useCart } from '@/src/state/cart';

function requestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Checkout() {
  const cart = useCart();
  const addresses=useQuery({queryKey:['addresses'],queryFn:getAddresses});
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const attemptId = useRef(requestId());

  async function submit() {
    if (!cart.storeId || cart.lines.length === 0) return;
    setBusy(true);
    try {
      await createOrder({ storeId: cart.storeId, items: cart.lines.map((x) => ({ id: x.item.id, quantity: x.quantity })), address: address.trim(), note: note.trim() || undefined, requestId: attemptId.current });
      cart.clear();
      Alert.alert('تم إرسال الطلب', 'هنفضل معاك لحد ما طلبك يوصل.');
      router.replace('/orders');
    } catch (error) {
      Alert.alert('تعذر تأكيد الطلب', 'يمكنك إعادة المحاولة بأمان؛ لن ننشئ نسخة مكررة من نفس الطلب.\n\n' + (error instanceof Error ? error.message : 'حاول مرة أخرى'));
    } finally { setBusy(false); }
  }

  return <Screen>
    <Title>تأكيد الطلب</Title>
    <Card>{cart.lines.map((x) => <View key={x.item.id} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><Text>{x.item.name} × {x.quantity}</Text><Text>{(x.item.price * x.quantity).toFixed(2)} ج</Text></View>)}<Muted>الإجمالي الظاهر تقديري؛ الخادم يعيد حساب الأسعار ورسوم التوصيل قبل الحفظ.</Muted></Card>
    {(addresses.data??[]).length ? <><Muted>اختار عنوان محفوظ أو اكتب عنوان جديد</Muted><View style={{gap:8}}>{(addresses.data??[]).slice(0,5).map((a:any)=><Pressable accessibilityRole="button" key={a.id} onPress={()=>setAddress(a.address_line)}><Card><Text style={{textAlign:'right',fontWeight:'800'}}>{a.label}{a.is_default?' • الافتراضي':''}</Text><Muted>{a.address_line}</Muted></Card></Pressable>)}</View></> : null}
    <Field accessibilityLabel="عنوان التوصيل" placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} />
    <Field accessibilityLabel="ملاحظات الطلب" placeholder="ملاحظات اختيارية" value={note} onChangeText={setNote} />
    <Button title={busy ? 'جاري تأكيد الطلب…' : 'تأكيد الطلب - كاش'} disabled={busy || address.trim().length < 5 || cart.lines.length === 0} onPress={submit} />
  </Screen>;
}
