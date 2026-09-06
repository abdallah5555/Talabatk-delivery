import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';
import { Card, Muted, Screen, Title } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { supabase } from '@/src/lib/supabase';
import type { Role } from '@/src/types/domain';

const names: Record<Role, string> = { customer: 'العميل', merchant: 'التاجر', driver: 'المندوب', admin: 'الإدارة' };

export default function RoleScreen() {
  const { role } = useLocalSearchParams<{ role: Role }>();
  const roles = useQuery({ queryKey: ['roles'], queryFn: getMyRoles });
  const allowed = !!role && (roles.data ?? []).includes(role);
  const dashboard = useQuery({
    queryKey: ['dashboard', role], enabled: allowed,
    queryFn: async () => {
      if (role === 'merchant') { const { data, error } = await supabase.from('stores').select('id,name,is_open,rating').order('created_at'); if (error) throw error; return data ?? []; }
      if (role === 'driver') { const { data, error } = await supabase.from('driver_status').select('is_online,updated_at').maybeSingle(); if (error) throw error; return data ? [data] : []; }
      if (role === 'admin') { const { data, error } = await supabase.rpc('admin_get_usage_metrics'); if (error) throw error; return Array.isArray(data) ? data : [data]; }
      return [];
    },
  });
  if (!allowed && !roles.isLoading) return <Screen><Title>غير مصرح</Title><Muted>الدور المطلوب غير مفعّل لحسابك.</Muted></Screen>;
  return <Screen><Title>لوحة {role ? names[role] : ''}</Title><Card><Muted>هذه اللوحة تقرأ فقط ما تسمح به سياسات Supabase لحسابك الحالي.</Muted><Text style={{ textAlign: 'right' }}>{dashboard.isLoading ? 'جاري التحميل…' : `تم تحميل ${dashboard.data?.length ?? 0} سجل متاح لهذا الدور.`}</Text></Card></Screen>;
}
