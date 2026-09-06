import { useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyApplications, submitDriverApplication, submitMerchantApplication } from '@/src/lib/features';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';

export default function Applications() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['applications'], queryFn: getMyApplications });
  const [businessName, setBusinessName] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantAddress, setMerchantAddress] = useState('');
  const [fullName, setFullName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicle, setVehicle] = useState('موتوسيكل');

  async function merchant() {
    try { await submitMerchantApplication({ businessName, phone: merchantPhone, address: merchantAddress, category: 'مطاعم' }); await client.invalidateQueries({ queryKey: ['applications'] }); Alert.alert('تم إرسال الطلب', 'الإدارة هتراجع طلب التاجر.'); }
    catch (e) { Alert.alert('تعذر الإرسال', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  async function driver() {
    try { await submitDriverApplication({ fullName, phone: driverPhone, vehicleType: vehicle }); await client.invalidateQueries({ queryKey: ['applications'] }); Alert.alert('تم إرسال الطلب', 'الإدارة هتراجع طلب المندوب.'); }
    catch (e) { Alert.alert('تعذر الإرسال', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }

  const existing = [...(query.data?.merchant ?? []).map((x: any) => ({ ...x, kind: 'تاجر', name: x.business_name })), ...(query.data?.driver ?? []).map((x: any) => ({ ...x, kind: 'مندوب', name: x.full_name }))];
  return <Screen><Title>انضم لفريق طلباتك</Title><Card><Text style={{ textAlign: 'right', fontWeight: '800' }}>طلب تاجر</Text><Field placeholder="اسم النشاط" value={businessName} onChangeText={setBusinessName} /><Field placeholder="رقم التواصل" keyboardType="phone-pad" value={merchantPhone} onChangeText={setMerchantPhone} /><Field placeholder="العنوان" value={merchantAddress} onChangeText={setMerchantAddress} /><Button title="إرسال طلب التاجر" onPress={merchant} disabled={!businessName || !merchantPhone || !merchantAddress} /></Card><Card><Text style={{ textAlign: 'right', fontWeight: '800' }}>طلب مندوب</Text><Field placeholder="الاسم الكامل" value={fullName} onChangeText={setFullName} /><Field placeholder="رقم التواصل" keyboardType="phone-pad" value={driverPhone} onChangeText={setDriverPhone} /><Field placeholder="وسيلة التوصيل" value={vehicle} onChangeText={setVehicle} /><Button title="إرسال طلب المندوب" onPress={driver} disabled={!fullName || !driverPhone || !vehicle} /></Card><FlatList data={existing} keyExtractor={(x: any) => x.id} contentContainerStyle={{ gap: 8 }} ListEmptyComponent={<Muted>مفيش طلبات انضمام سابقة.</Muted>} renderItem={({ item }: any) => <Card><Text style={{ textAlign: 'right', fontWeight: '800' }}>{item.kind}: {item.name}</Text><Muted>الحالة: {item.status}</Muted></Card>} /></Screen>;
}
