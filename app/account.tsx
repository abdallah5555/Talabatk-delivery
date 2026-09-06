import { useQuery } from '@tanstack/react-query';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { supabase } from '@/src/lib/supabase';

const names = { customer: 'عميل', merchant: 'تاجر', driver: 'مندوب', admin: 'إدارة' } as const;

export default function Account() {
  const roles = useQuery({ queryKey: ['roles'], queryFn: getMyRoles });
  const list=roles.data??[];
  return <Screen><Title>حسابي</Title><Card><Muted>الخدمات السريعة</Muted><View style={{ gap: 8 }}><Button title="بياناتي والخصوصية" onPress={() => router.push('/privacy')} /><Button title="الأمان والرقم السري" onPress={() => router.push('/security')} /><Button title="العناوين المحفوظة" onPress={() => router.push('/addresses')} /><Button title="المفضلة" onPress={() => router.push('/favorites')} /><Button title="الإشعارات" onPress={() => router.push('/notifications')} /><Button title="الدعم والشكاوى" onPress={() => router.push('/support')} /><Button title="انضم كتاجر أو مندوب" onPress={() => router.push('/applications')} />{list.includes('driver')?<Button title="أرباح وبلاغات المندوب" onPress={()=>router.push('/driver-operations')}/>:null}{list.includes('admin')?<Button title="مركز الإدارة المتقدم" onPress={()=>router.push('/admin-operations')}/>:null}</View></Card><Card><Muted>الأدوار المصرح بها لحسابك</Muted>{list.map((role) => <Pressable key={role} onPress={() => router.push({ pathname: '/role/[role]', params: { role } })} style={{ paddingVertical: 10 }}><Text style={{ textAlign: 'right', fontWeight: '800' }}>{names[role]}</Text></Pressable>)}</Card><Button title="تسجيل الخروج" onPress={async () => { const { error } = await supabase.auth.signOut(); if (error) return Alert.alert('تعذر الخروج', error.message); router.replace('/login'); }} /></Screen>;
}
