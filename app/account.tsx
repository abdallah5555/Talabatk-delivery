import { useQuery } from '@tanstack/react-query';
import { Alert, Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { supabase } from '@/src/lib/supabase';

const names = { customer: 'عميل', merchant: 'تاجر', driver: 'مندوب', admin: 'إدارة' } as const;

export default function Account() {
  const roles = useQuery({ queryKey: ['roles'], queryFn: getMyRoles });
  return <Screen><Title>حسابي</Title><Card><Muted>اختار الواجهة المناسبة من الأدوار المصرح بها لحسابك.</Muted>{(roles.data ?? []).map((role) => <Pressable key={role} onPress={() => router.push({ pathname: '/role/[role]', params: { role } })} style={{ paddingVertical: 10 }}><Text style={{ textAlign: 'right', fontWeight: '800' }}>{names[role]}</Text></Pressable>)}</Card><Button title="تسجيل الخروج" onPress={async () => { const { error } = await supabase.auth.signOut(); if (error) return Alert.alert('تعذر الخروج', error.message); router.replace('/login'); }} /></Screen>;
}
