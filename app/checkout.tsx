import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { createOrder } from '@/src/lib/api';
import { useCart } from '@/src/state/cart';

export default function Checkout() {
  const cart = useCart();
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!cart.storeId || cart.lines.length === 0) return;
    setBusy(true);
    try {
      await createOrder({ storeId: cart.storeId, items: cart.lines.map((x) => ({ id: x.item.id, quantity: x.quantity })), address: address.trim(), note: note.trim() || undefined });
      cart.clear();
      Alert.alert('تم إرسال الطلب', 'هنفضل معاك لحد ما طلبك يوصل.');
      router.replace('/orders');
    } catch (error) {
      Alert.alert('تعذر إرسال الطلب', error instanceof Error ? error.message : 'حاول مرة أخرى');
    } finally { setBusy(false); }
  }

  return <Screen><Title>تأكيد الطلب</Title><Card>{cart.lines.map((x) => <View key={x.item.id} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}><Text>{x.item.name} × {x.quantity}</Text><Text>{(x.item.price * x.quantity).toFixed(2)} ج</Text></View>)}<Muted>الإجمالي الظاهر تقديري؛ الخادم يعيد حساب الأسعار ورسوم التوصيل قبل الحفظ.</Muted></Card><Field accessibilityLabel="عنوان التوصيل" placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} /><Field accessibilityLabel="ملاحظات الطلب" placeholder="ملاحظات اختيارية" value={note} onChangeText={setNote} /><Button title={busy ? 'جاري إرسال الطلب…' : 'تأكيد الطلب - كاش'} disabled={busy || address.trim().length < 5 || cart.lines.length === 0} onPress={submit} /></Screen>;
}
