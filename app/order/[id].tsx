import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { DriverMap } from '@/src/components/DriverMap';
import { getMyOrder, getOrderTimeline, subscribeToOrder } from '@/src/lib/api';
import { getMyReview, getReorderLines, submitStoreReview } from '@/src/lib/customerOps';
import { getDriverLocationForOrder, subscribeToDriverLocation } from '@/src/lib/tracking';
import { useCart } from '@/src/state/cart';

const labels: Record<string, string> = { pending: 'بانتظار التاجر', accepted: 'تم قبول الطلب', preparing: 'جاري التحضير', ready: 'جاهز للاستلام', assigned: 'تم تعيين مندوب', picked_up: 'استلم المندوب الطلب', on_the_way: 'المندوب في الطريق', delivered: 'تم التسليم', cancelled: 'تم الإلغاء', rejected: 'تم رفض الطلب' };
const liveStatuses = new Set(['assigned','picked_up','on_the_way']);

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const cart = useCart();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const order = useQuery({ queryKey: ['order', id], queryFn: () => getMyOrder(id!), enabled: Boolean(id) });
  const timeline = useQuery({ queryKey: ['order-timeline', id], queryFn: () => getOrderTimeline(id!), enabled: Boolean(id) });
  const liveTracking = Boolean(order.data && liveStatuses.has(order.data.status));
  const driverLocation = useQuery({ queryKey: ['driver-location', id], queryFn: () => getDriverLocationForOrder(id!), enabled: Boolean(id) && liveTracking, refetchInterval: 30_000 });
  const review = useQuery({ queryKey: ['order-review', id], queryFn: () => getMyReview(id!), enabled: Boolean(id) && order.data?.status === 'delivered' });

  useEffect(() => {
    if (!id) return;
    return subscribeToOrder(id, () => {
      void qc.invalidateQueries({ queryKey: ['order', id] });
      void qc.invalidateQueries({ queryKey: ['order-timeline', id] });
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
    });
  }, [id, qc]);

  useEffect(() => {
    const driverId = order.data?.driver_id;
    if (!id || !driverId || !liveTracking) return;
    return subscribeToDriverLocation(driverId, (location) => qc.setQueryData(['driver-location', id], location));
  }, [id, liveTracking, order.data?.driver_id, qc]);

  async function sendReview() {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      await submitStoreReview(id, rating, comment);
      await qc.invalidateQueries({ queryKey: ['order-review', id] });
      await qc.invalidateQueries({ queryKey: ['stores'] });
      Alert.alert('شكرًا ليك', 'تم تسجيل تقييمك.');
    } catch (e) {
      Alert.alert('تعذر تسجيل التقييم', e instanceof Error ? e.message : 'حاول مرة تانية');
    } finally { setSubmitting(false); }
  }

  async function reorder() {
    if (!id || reordering) return;
    setReordering(true);
    try {
      const lines = await getReorderLines(id);
      if (!lines.length) {
        Alert.alert('الطلب غير متاح', 'المنتجات القديمة غير متاحة حاليًا.');
        return;
      }
      cart.clear();
      for (const line of lines) for (let n = 0; n < line.quantity; n += 1) cart.add(line.item);
      router.push('/checkout');
    } catch (e) {
      Alert.alert('تعذر إعادة الطلب', e instanceof Error ? e.message : 'حاول مرة تانية');
    } finally { setReordering(false); }
  }

  const locationAgeSeconds = driverLocation.data?.updated_at ? Math.max(0, Math.floor((Date.now() - new Date(driverLocation.data.updated_at).getTime()) / 1000)) : null;

  return <Screen>
    <Title>تتبع الطلب</Title>
    {order.isLoading ? <Muted>جاري تحميل الطلب...</Muted> : order.isError ? <Muted>تعذر تحميل الطلب. حاول مرة تانية.</Muted> : order.data ? <>
      <Card>
        <Text style={{ fontWeight: '900', textAlign: 'right', fontSize: 18 }}>{labels[order.data.status] ?? order.data.status}</Text>
        <Muted>طلب #{order.data.id.slice(0, 8)}</Muted>
        <Text style={{ fontWeight: '800', textAlign: 'right' }}>{order.data.total.toFixed(2)} ج</Text>
        <Muted>{order.data.delivery_address}</Muted>
      </Card>
      {liveTracking ? <>
        <Title>موقع المندوب</Title>
        {driverLocation.data ? <>
          <DriverMap latitude={driverLocation.data.latitude} longitude={driverLocation.data.longitude} />
          <Muted>{locationAgeSeconds != null && locationAgeSeconds > 120 ? 'آخر موقع قديم نسبيًا؛ ممكن يكون GPS أو الشبكة ضعيفة.' : 'الموقع بيتحدث لحظيًا أثناء تشغيل GPS عند المندوب.'}</Muted>
        </> : <Card><Muted>{driverLocation.isLoading ? 'جاري تحديد موقع المندوب…' : 'لسه مفيش موقع متاح للمندوب.'}</Muted></Card>}
      </> : null}
      <Title>خط سير الطلب</Title>
      <View style={{ gap: 8 }}>
        {(timeline.data ?? []).map((event) => <Card key={event.id}>
          <Text style={{ fontWeight: '800', textAlign: 'right' }}>{labels[event.status] ?? event.status}</Text>
          <Muted>{new Date(event.created_at).toLocaleString('ar-EG')}</Muted>
        </Card>)}
      </View>
      <Muted>الحالة بتتحدث تلقائيًا عند أي تغيير.</Muted>
      {order.data.status === 'delivered' ? <>
        <Button title={reordering ? 'جاري تجهيز السلة…' : 'اطلب نفس الطلب مرة تانية'} disabled={reordering} onPress={reorder} />
        <Title>قيّم تجربتك</Title>
        {review.data ? <Card><Text style={{ textAlign: 'right', fontWeight: '900' }}>{'★'.repeat(review.data.rating)}{'☆'.repeat(5-review.data.rating)}</Text><Muted>{review.data.comment || 'بدون تعليق'}</Muted></Card> : <Card>
          <View style={{ flexDirection: 'row-reverse', gap: 8, justifyContent: 'center' }}>{[1,2,3,4,5].map((n) => <Text key={n} accessibilityRole="button" onPress={() => setRating(n)} style={{ fontSize: 32 }}>{n <= rating ? '★' : '☆'}</Text>)}</View>
          <Field value={comment} onChangeText={setComment} placeholder="اكتب رأيك اختياريًا" multiline maxLength={1000} />
          <Button title={submitting ? 'جاري الإرسال…' : 'إرسال التقييم'} disabled={submitting} onPress={sendReview} />
        </Card>}
      </> : null}
    </> : null}
  </Screen>;
}
