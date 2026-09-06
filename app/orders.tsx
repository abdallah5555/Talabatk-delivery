import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, Text } from 'react-native';
import { Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyOrders } from '@/src/lib/api';

const labels: Record<string, string> = { pending: 'بانتظار التاجر', accepted: 'تم القبول', preparing: 'جاري التحضير', ready: 'جاهز للاستلام', assigned: 'تم تعيين مندوب', picked_up: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغي', rejected: 'مرفوض' };

export default function Orders() {
  const query = useQuery({ queryKey: ['my-orders'], queryFn: getMyOrders, refetchInterval: 15_000 });
  return <Screen><Title>طلباتي</Title><FlatList data={query.data ?? []} keyExtractor={(x) => x.id} refreshing={query.isFetching} onRefresh={() => query.refetch()} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>مفيش طلبات لسه.</Muted>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`تتبع الطلب ${item.id.slice(0, 8)}`} onPress={() => router.push(`/order/${item.id}`)}><Card><Text style={{ fontWeight: '800', textAlign: 'right' }}>طلب #{item.id.slice(0, 8)}</Text><Muted>{labels[item.status] ?? item.status}</Muted><Text style={{ fontWeight: '700', textAlign: 'right' }}>{item.total.toFixed(2)} ج</Text><Muted>{new Date(item.created_at).toLocaleString('ar-EG')}</Muted><Text style={{ textAlign: 'right', fontWeight: '700' }}>اضغط للتتبع ←</Text></Card></Pressable>} /></Screen>;
}
