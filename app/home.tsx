import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getStores } from '@/src/lib/api';

export default function Home() {
  const stores = useQuery({ queryKey: ['stores'], queryFn: getStores });
  return <Screen><Title>إيه اللي محتاجه النهارده؟</Title><Muted>اختار متجر واطلب، وإحنا نخليك متابع كل خطوة.</Muted><View style={{ flexDirection: 'row-reverse', gap: 8 }}><View style={{ flex: 1 }}><Button title="طلباتي" onPress={() => router.push('/orders')} /></View><View style={{ flex: 1 }}><Button title="حسابي" onPress={() => router.push('/account')} /></View></View>{stores.isError ? <Muted>تعذر تحميل المتاجر. حاول مرة أخرى.</Muted> : null}<FlatList data={stores.data ?? []} refreshing={stores.isFetching} onRefresh={() => stores.refetch()} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}><Card><Text style={{ fontWeight: '800', fontSize: 18, textAlign: 'right' }}>{item.name}</Text><Muted>{item.category ?? 'متجر'} • ⭐ {item.rating.toFixed(1)}</Muted><Muted>{item.is_open ? `مفتوح • التوصيل ${item.delivery_fee} ج` : 'مغلق حاليًا'}</Muted></Card></Pressable>} /></Screen>;
}
