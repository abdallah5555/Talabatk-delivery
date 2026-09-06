import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyOrder, getOrderTimeline, subscribeToOrder } from '@/src/lib/api';

const labels: Record<string, string> = { pending: 'بانتظار التاجر', accepted: 'تم قبول الطلب', preparing: 'جاري التحضير', ready: 'جاهز للاستلام', assigned: 'تم تعيين مندوب', picked_up: 'المندوب في الطريق', delivered: 'تم التسليم', cancelled: 'تم الإلغاء', rejected: 'تم رفض الطلب' };

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => getMyOrder(id!), enabled: Boolean(id) });
  const timeline = useQuery({ queryKey: ['order-timeline', id], queryFn: () => getOrderTimeline(id!), enabled: Boolean(id) });

  useEffect(() => {
    if (!id) return;
    return subscribeToOrder(id, () => {
      void qc.invalidateQueries({ queryKey: ['order', id] });
      void qc.invalidateQueries({ queryKey: ['order-timeline', id] });
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
    });
  }, [id, qc]);

  return <Screen>
    <Title>تتبع الطلب</Title>
    {order.isLoading ? <Muted>جاري تحميل الطلب...</Muted> : order.isError ? <Muted>تعذر تحميل الطلب. حاول مرة تانية.</Muted> : order.data ? <>
      <Card>
        <Text style={{ fontWeight: '900', textAlign: 'right', fontSize: 18 }}>{labels[order.data.status] ?? order.data.status}</Text>
        <Muted>طلب #{order.data.id.slice(0, 8)}</Muted>
        <Text style={{ fontWeight: '800', textAlign: 'right' }}>{order.data.total.toFixed(2)} ج</Text>
        <Muted>{order.data.delivery_address}</Muted>
      </Card>
      <Title>خط سير الطلب</Title>
      <View style={{ gap: 8 }}>
        {(timeline.data ?? []).map((event) => <Card key={event.id}>
          <Text style={{ fontWeight: '800', textAlign: 'right' }}>{labels[event.status] ?? event.status}</Text>
          <Muted>{new Date(event.created_at).toLocaleString('ar-EG')}</Muted>
        </Card>)}
      </View>
      <Muted>الحالة بتتحدث تلقائيًا عند أي تغيير.</Muted>
    </> : null}
  </Screen>;
}
