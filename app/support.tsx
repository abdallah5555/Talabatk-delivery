import { useState } from 'react';
import { Alert, FlatList, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getComplaints, submitComplaint } from '@/src/lib/features';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';

export default function Support() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['complaints'], queryFn: getComplaints });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try { await submitComplaint({ subject, message }); setSubject(''); setMessage(''); await client.invalidateQueries({ queryKey: ['complaints'] }); }
    catch (e) { Alert.alert('تعذر إرسال الشكوى', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }
  return <Screen><Title>الدعم والشكاوى</Title><Card><Field value={subject} onChangeText={setSubject} placeholder="موضوع الشكوى" accessibilityLabel="موضوع الشكوى" /><Field value={message} onChangeText={setMessage} placeholder="اكتب التفاصيل" accessibilityLabel="تفاصيل الشكوى" multiline /><Button title={busy ? 'جاري الإرسال…' : 'إرسال'} onPress={send} disabled={busy || subject.trim().length < 3 || message.trim().length < 5} /></Card><FlatList data={query.data ?? []} keyExtractor={(x: any) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>لا توجد شكاوى حالية.</Muted>} renderItem={({ item }: any) => <Card><Text style={{ textAlign: 'right', fontWeight: '800' }}>{item.subject}</Text><Muted>{item.message}</Muted><Muted>الحالة: {item.status}</Muted>{item.admin_note ? <Muted>رد الإدارة: {item.admin_note}</Muted> : null}</Card>} /></Screen>;
}
