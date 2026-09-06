import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Text } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getFavorites, toggleFavorite } from '@/src/lib/features';

export default function Favorites() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['favorites'], queryFn: getFavorites });
  return <Screen><Title>المفضلة</Title><FlatList data={query.data ?? []} keyExtractor={(x: any) => x.store_id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>لسه ما ضفتش متاجر للمفضلة.</Muted>} renderItem={({ item }: any) => {
    const store = Array.isArray(item.stores) ? item.stores[0] : item.stores;
    return <Card><Text style={{ textAlign: 'right', fontWeight: '800', fontSize: 17 }}>{store?.name ?? 'متجر'}</Text><Muted>{store?.category ?? ''} {store?.is_open ? '• مفتوح' : '• مغلق'}</Muted><Button title="إزالة من المفضلة" onPress={async () => { await toggleFavorite(item.store_id, false); await client.invalidateQueries({ queryKey: ['favorites'] }); }} /></Card>;
  }} /></Screen>;
}
