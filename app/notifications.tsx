import { FlatList, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Muted, Screen, Title } from '@/src/components/ui';
import { getNotifications, markNotificationRead } from '@/src/lib/features';

export default function Notifications() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: getNotifications, refetchInterval: 20_000 });
  return <Screen><Title>الإشعارات</Title><FlatList data={query.data ?? []} keyExtractor={(x: any) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>مفيش إشعارات جديدة.</Muted>} renderItem={({ item }: any) => <Card><Text onPress={async () => { if (!item.is_read) { await markNotificationRead(item.id); await client.invalidateQueries({ queryKey: ['notifications'] }); } }} style={{ textAlign: 'right', fontWeight: item.is_read ? '600' : '900' }}>{item.title}</Text><Muted>{item.body}</Muted><Muted>{new Date(item.created_at).toLocaleString('ar-EG')}</Muted></Card>} /></Screen>;
}
