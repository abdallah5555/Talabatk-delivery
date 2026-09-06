import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getDeletionRequests, getMyProfile, requestAccountDeletion, updateMyProfile } from '@/src/lib/privacy';

export default function PrivacyScreen() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const deletion = useQuery({ queryKey: ['deletion-requests'], queryFn: getDeletionRequests });
  const [nameDraft,setNameDraft] = useState<string|null>(null);
  const [phoneDraft,setPhoneDraft] = useState<string|null>(null);
  const [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false);
  const name=nameDraft ?? profile.data?.full_name ?? '';
  const phone=phoneDraft ?? profile.data?.phone ?? '';

  async function save() {
    setBusy(true);
    try { await updateMyProfile({ fullName:name, phone }); setNameDraft(null); setPhoneDraft(null); await qc.invalidateQueries({ queryKey:['my-profile'] }); Alert.alert('تم','تم تحديث بيانات الحساب.'); }
    catch(e){ Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى'); }
    finally{ setBusy(false); }
  }
  async function requestDeletion() {
    Alert.alert('طلب حذف الحساب','سيتم إرسال طلب للمراجعة. لن يتم حذف الحساب فورًا حتى يتم استكمال الالتزامات التشغيلية وحماية السجلات المطلوبة.',[
      {text:'إلغاء',style:'cancel'},
      {text:'إرسال الطلب',style:'destructive',onPress:async()=>{setBusy(true);try{await requestAccountDeletion(reason);setReason('');await qc.invalidateQueries({queryKey:['deletion-requests']});Alert.alert('تم','تم تسجيل طلب حذف الحساب.');}catch(e){Alert.alert('تعذر الطلب',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}}
    ]);
  }
  return <Screen><Title>الخصوصية وبيانات الحساب</Title>
    <Card><Field value={name} onChangeText={setNameDraft} placeholder="الاسم"/><Field value={phone} onChangeText={setPhoneDraft} placeholder="رقم الهاتف" keyboardType="phone-pad"/><Button title={busy?'جاري الحفظ…':'حفظ البيانات'} disabled={busy} onPress={save}/></Card>
    <Title>طلبات حذف الحساب</Title>{(deletion.data??[]).map((r:any)=><Card key={r.id}><Text style={{fontWeight:'900',textAlign:'right'}}>الحالة: {r.status}</Text><Muted>{new Date(r.created_at).toLocaleString('ar-EG')}</Muted>{r.admin_note?<Muted>{r.admin_note}</Muted>:null}</Card>)}
    <Card><Field value={reason} onChangeText={setReason} placeholder="سبب الطلب اختياري" multiline/><Button title="طلب حذف الحساب والبيانات" disabled={busy} onPress={requestDeletion}/><Muted>الطلب لا يمنح أي صلاحية للعميل لحذف سجلات الطلبات أو التدقيق مباشرة.</Muted></Card>
  </Screen>;
}
