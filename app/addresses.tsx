import { useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addAddress, deleteAddress, getAddresses } from '@/src/lib/features';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';

export default function Addresses() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const [label, setLabel] = useState('المنزل');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try { await addAddress({ label, address }); setAddress(''); await client.invalidateQueries({ queryKey: ['addresses'] }); }
    catch (e) { Alert.alert('تعذر حفظ العنوان', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }
  return <Screen><Title>عناويني</Title><Card><Field value={label} onChangeText={setLabel} placeholder="اسم العنوان" accessibilityLabel="اسم العنوان" /><Field value={address} onChangeText={setAddress} placeholder="العنوان بالتفصيل" accessibilityLabel="العنوان بالتفصيل" /><Button title={busy ? 'جاري الحفظ…' : 'حفظ عنوان'} onPress={add} disabled={busy || address.trim().length < 5} /></Card><FlatList data={query.data ?? []} keyExtractor={(x: any) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>مفيش عناوين محفوظة.</Muted>} renderItem={({ item }: any) => <Card><Text style={{ textAlign: 'right', fontWeight: '800' }}>{item.label}</Text><Muted>{item.address_line}</Muted><Button title="حذف" onPress={async () => { await deleteAddress(item.id); await client.invalidateQueries({ queryKey: ['addresses'] }); }} /></Card>} /></Screen>;
}
