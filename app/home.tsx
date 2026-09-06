import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getStores } from '@/src/lib/api';
import { getActiveAds, pickAd } from '@/src/lib/ads';
import { AdSlot } from '@/src/components/AdSlot';

export default function Home() {
  const stores = useQuery({ queryKey: ['stores'], queryFn: getStores });
  const ads = useQuery({ queryKey:['ads'], queryFn:getActiveAds, staleTime:60_000 });
  const [search,setSearch]=useState('');
  const [openOnly,setOpenOnly]=useState(false);
  const [category,setCategory]=useState('الكل');
  const categories=useMemo(()=>['الكل',...Array.from(new Set((stores.data??[]).map(x=>x.category).filter((x):x is string=>Boolean(x))))],[stores.data]);
  const visible=useMemo(()=>{
    const q=search.trim().toLocaleLowerCase('ar');
    return (stores.data??[]).filter(s=>(!openOnly||s.is_open)&&(category==='الكل'||s.category===category)&&(!q||`${s.name} ${s.category??''} ${s.description??''}`.toLocaleLowerCase('ar').includes(q)));
  },[stores.data,search,openOnly,category]);
  return <Screen>
    <Title>إيه اللي محتاجه النهارده؟</Title>
    <Muted>اختار متجر واطلب، وإحنا نخليك متابع كل خطوة.</Muted>
    <AdSlot ad={pickAd(ads.data,'home_top')} />
    <View style={{ flexDirection: 'row-reverse', gap: 8 }}><View style={{ flex: 1 }}><Button title="طلباتي" onPress={() => router.push('/orders')} /></View><View style={{ flex: 1 }}><Button title="حسابي" onPress={() => router.push('/account')} /></View></View>
    <Field accessibilityLabel="بحث المتاجر" placeholder="دور باسم المتجر أو النوع" value={search} onChangeText={setSearch}/>
    <View style={{flexDirection:'row-reverse',gap:8,flexWrap:'wrap'}}>
      <Pressable accessibilityRole="button" onPress={()=>setOpenOnly(v=>!v)} style={{padding:10,borderWidth:1,borderRadius:12}}><Text>{openOnly?'✓ المفتوح الآن':'المفتوح الآن'}</Text></Pressable>
      {categories.slice(0,5).map(c=><Pressable key={c} accessibilityRole="button" onPress={()=>setCategory(c)} style={{padding:10,borderWidth:1,borderRadius:12}}><Text style={{fontWeight:category===c?'900':'400'}}>{c}</Text></Pressable>)}
    </View>
    <AdSlot ad={pickAd(ads.data,'home_feed')} />
    {stores.isError ? <Muted>تعذر تحميل المتاجر. حاول مرة أخرى.</Muted> : null}
    <FlatList data={visible} refreshing={stores.isFetching} onRefresh={() => stores.refetch()} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>{stores.isLoading?'جاري تحميل المتاجر…':'مفيش متاجر مطابقة للبحث.'}</Muted>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`فتح متجر ${item.name}`} onPress={() => router.push({ pathname: '/store/[id]', params: { id: item.id } })}><Card><Text style={{ fontWeight: '800', fontSize: 18, textAlign: 'right' }}>{item.name}</Text><Muted>{item.category ?? 'متجر'} • ⭐ {item.rating.toFixed(1)}</Muted><Muted>{item.is_open ? `مفتوح • التوصيل ${item.delivery_fee} ج` : 'مغلق حاليًا'}</Muted></Card></Pressable>} />
  </Screen>;
}
