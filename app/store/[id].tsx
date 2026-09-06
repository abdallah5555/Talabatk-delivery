import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Text } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMenu } from '@/src/lib/api';
import { useCart } from '@/src/state/cart';
import { getActiveAds, pickAd } from '@/src/lib/ads';
import { AdSlot } from '@/src/components/AdSlot';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const menu = useQuery({ queryKey: ['menu', id], queryFn: () => getMenu(id!), enabled: !!id });
  const ads = useQuery({ queryKey:['ads'], queryFn:getActiveAds, staleTime:60_000 });
  const cart = useCart();
  return <Screen><Title>المنيو</Title><Muted>الأسعار النهائية يتم التحقق منها على الخادم وقت تأكيد الطلب.</Muted><FlatList data={menu.data ?? []} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} renderItem={({ item }) => <Card><Text style={{ fontWeight: '800', fontSize: 17, textAlign: 'right' }}>{item.name}</Text><Muted>{item.description ?? item.category ?? ''}</Muted><Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.price} ج</Text><Button title="أضف للسلة" onPress={() => cart.add(item)} /></Card>} ListFooterComponent={<AdSlot ad={pickAd(ads.data,'store_bottom')} />} />{cart.lines.length > 0 ? <Button title={`السلة • ${cart.total.toFixed(2)} ج`} onPress={() => router.push('/checkout')} /> : null}</Screen>;
}
