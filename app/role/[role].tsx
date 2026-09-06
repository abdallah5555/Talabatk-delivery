import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { acceptDriverOrder, advanceDriverOrder, decideApplication, getAdminQueues, getAvailableDriverOrders, getDriverState, getMerchantOrders, getMerchantStores, getMyDriverOrders, merchantUpdateOrder, setDriverAvailability, updateComplaint } from '@/src/lib/features';
import type { Role } from '@/src/types/domain';

const names: Record<Role, string> = { customer: 'العميل', merchant: 'التاجر', driver: 'المندوب', admin: 'الإدارة' };

export default function RoleScreen() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const roles = useQuery({ queryKey: ['roles'], queryFn: getMyRoles });
  if (roles.isLoading) return <Screen><Muted>جاري التحقق من الصلاحيات…</Muted></Screen>;
  if (!role || !(roles.data ?? []).includes(role)) return <Screen><Title>غير مصرح</Title><Muted>الدور المطلوب غير مفعّل لحسابك.</Muted></Screen>;
  if (role === 'merchant') return <MerchantDashboard />;
  if (role === 'driver') return <DriverDashboard />;
  if (role === 'admin') return <AdminDashboard />;
  return <Screen><Title>لوحة {names.customer}</Title><Muted>استخدم الصفحة الرئيسية للطلب والتتبع.</Muted></Screen>;
}

function MerchantDashboard() {
  const client = useQueryClient();
  const stores = useQuery({ queryKey: ['merchant-stores'], queryFn: getMerchantStores });
  const ids = (stores.data ?? []).map((x: any) => x.id);
  const orders = useQuery({ queryKey: ['merchant-orders', ids.join(',')], queryFn: () => getMerchantOrders(ids), enabled: ids.length > 0, refetchInterval: 12_000 });
  async function move(id: string, status: 'accepted'|'rejected'|'preparing'|'ready') {
    try { await merchantUpdateOrder(id, status); await client.invalidateQueries({ queryKey: ['merchant-orders'] }); }
    catch (e) { Alert.alert('تعذر تحديث الطلب', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  return <Screen><Title>لوحة التاجر</Title><Muted>{stores.data?.length ? `عندك ${stores.data.length} متجر` : 'لا يوجد متجر معتمد للحساب.'}</Muted><FlatList data={orders.data ?? []} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>لا توجد طلبات تشغيل حالية.</Muted>} renderItem={({ item }) => <Card><Text style={{ textAlign: 'right', fontWeight: '900' }}>طلب #{item.id.slice(0,8)}</Text><Muted>الحالة: {item.status} • الإجمالي {item.total.toFixed(2)} ج</Muted><View style={{ gap: 7 }}>{item.status==='pending' ? <><Button title="قبول الطلب" onPress={() => move(item.id,'accepted')} /><Button title="رفض الطلب" onPress={() => move(item.id,'rejected')} /></> : null}{item.status==='accepted' ? <Button title="بدء التحضير" onPress={() => move(item.id,'preparing')} /> : null}{item.status==='preparing' ? <Button title="جاهز للاستلام" onPress={() => move(item.id,'ready')} /> : null}</View></Card>} /></Screen>;
}

function DriverDashboard() {
  const client = useQueryClient();
  const state = useQuery({ queryKey: ['driver-state'], queryFn: getDriverState });
  const available = useQuery({ queryKey: ['driver-available'], queryFn: getAvailableDriverOrders, enabled: !!state.data?.is_online, refetchInterval: 10_000 });
  const active = useQuery({ queryKey: ['driver-active'], queryFn: getMyDriverOrders, refetchInterval: 10_000 });
  async function toggle() {
    try { await setDriverAvailability(!state.data?.is_online); await client.invalidateQueries({ queryKey: ['driver-state'] }); await client.invalidateQueries({ queryKey: ['driver-available'] }); }
    catch (e) { Alert.alert('تعذر تغيير الحالة', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  async function accept(id: string) {
    try { await acceptDriverOrder(id); await client.invalidateQueries({ queryKey: ['driver-available'] }); await client.invalidateQueries({ queryKey: ['driver-active'] }); }
    catch (e) { Alert.alert('الطلب لم يعد متاحًا', e instanceof Error ? e.message : 'اختار طلب آخر'); }
  }
  async function advance(id: string, status: 'picked_up'|'on_the_way'|'delivered') {
    try { await advanceDriverOrder(id,status); await client.invalidateQueries({ queryKey: ['driver-active'] }); }
    catch (e) { Alert.alert('تعذر تحديث الطلب', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  return <Screen><Title>لوحة المندوب</Title><Card><Text style={{ textAlign: 'right', fontWeight: '900' }}>{state.data?.is_online ? 'متاح لاستقبال الطلبات' : 'غير متاح حاليًا'}</Text><Button title={state.data?.is_online ? 'إنهاء الوردية' : 'ابدأ الوردية'} onPress={toggle} /></Card><Title>طلباتي الحالية</Title>{(active.data ?? []).map((item) => <Card key={item.id}><Text style={{ textAlign: 'right', fontWeight: '900' }}>#{item.id.slice(0,8)} • {item.delivery_fee.toFixed(2)} ج</Text><Muted>{item.status}</Muted>{item.status==='assigned' ? <Button title="تم الاستلام من التاجر" onPress={() => advance(item.id,'picked_up')} /> : null}{item.status==='picked_up' ? <Button title="أنا في الطريق" onPress={() => advance(item.id,'on_the_way')} /> : null}{item.status==='on_the_way' ? <Button title="تم التسليم" onPress={() => advance(item.id,'delivered')} /> : null}</Card>)}<Title>طلبات متاحة</Title><FlatList data={available.data ?? []} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>{state.data?.is_online ? 'مفيش طلبات متاحة حاليًا.' : 'فعّل حالة متاح لعرض الطلبات.'}</Muted>} renderItem={({ item }) => <Card><Text style={{ textAlign: 'right', fontWeight: '900' }}>توصيل {item.delivery_fee.toFixed(2)} ج</Text><Muted>العنوان يظهر وفق صلاحية مرحلة الطلب.</Muted><Button title="قبول الطلب" onPress={() => accept(item.id)} /></Card>} /></Screen>;
}

function AdminDashboard() {
  const client = useQueryClient();
  const queues = useQuery({ queryKey: ['admin-queues'], queryFn: getAdminQueues, refetchInterval: 15_000 });
  async function decide(kind: 'merchant'|'driver', id: string, status: 'approved'|'rejected') {
    try { await decideApplication(kind,id,status); await client.invalidateQueries({ queryKey: ['admin-queues'] }); }
    catch (e) { Alert.alert('تعذر تنفيذ القرار', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  async function resolve(id: string) {
    try { await updateComplaint(id,'resolved','تمت مراجعة الشكوى وإغلاق الإجراء المطلوب.'); await client.invalidateQueries({ queryKey: ['admin-queues'] }); }
    catch (e) { Alert.alert('تعذر تحديث الشكوى', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  const apps = [...(queues.data?.merchant ?? []).map((x: any) => ({ ...x, kind: 'merchant' as const, title: x.business_name })), ...(queues.data?.driver ?? []).map((x: any) => ({ ...x, kind: 'driver' as const, title: x.full_name }))];
  return <Screen><Title>لوحة الإدارة</Title><Muted>الموافقات الحساسة تنفذ من RPC محمي وتُسجل في Audit Log.</Muted><Title>طلبات الانضمام</Title>{apps.map((item: any) => <Card key={item.id}><Text style={{ textAlign: 'right', fontWeight: '900' }}>{item.kind==='merchant' ? 'تاجر' : 'مندوب'} • {item.title}</Text><Muted>{item.phone}</Muted><View style={{ gap: 7 }}><Button title="موافقة" onPress={() => decide(item.kind,item.id,'approved')} /><Button title="رفض" onPress={() => decide(item.kind,item.id,'rejected')} /></View></Card>)}<Title>الشكاوى المفتوحة</Title>{(queues.data?.complaints ?? []).map((item: any) => <Card key={item.id}><Text style={{ textAlign: 'right', fontWeight: '900' }}>{item.subject}</Text><Muted>{item.message}</Muted><Button title="تم الحل" onPress={() => resolve(item.id)} /></Card>)}</Screen>;
}
