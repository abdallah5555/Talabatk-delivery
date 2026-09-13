import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getDeletionRequests, getMyProfile, requestAccountDeletion, updateMyProfile } from '@/src/lib/privacy';

export default function PrivacyScreen() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile });
  const deletion = useQuery({ queryKey: ['deletion-requests'], queryFn: getDeletionRequests });
  const [nameDraft,setNameDraft] = useState<string|null>(null);
  const [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false);
  const [notice,setNotice]=useState<{type:'ok'|'error';text:string}|null>(null);
  const name=nameDraft ?? profile.data?.full_name ?? '';
  const phone=profile.data?.phone ?? '';

  async function save() {
    setBusy(true);setNotice(null);
    try { await updateMyProfile({ fullName:name }); setNameDraft(null); await Promise.all([qc.invalidateQueries({ queryKey:['my-profile'] }),qc.invalidateQueries({queryKey:['profile-summary']})]); setNotice({type:'ok',text:'تم تحديث اسم الحساب بنجاح.'}); }
    catch(e){ setNotice({type:'error',text:e instanceof Error?e.message:'تعذر تحديث البيانات. حاول مرة أخرى.'}); }
    finally{ setBusy(false); }
  }
  async function sendDeletion(){
    setBusy(true);setNotice(null);
    try{await requestAccountDeletion(reason);setReason('');await qc.invalidateQueries({queryKey:['deletion-requests']});setNotice({type:'ok',text:'تم تسجيل طلب حذف الحساب للمراجعة.'});}
    catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'تعذر إرسال الطلب.'});}
    finally{setBusy(false);}
  }
  return <Screen><Title>بياناتي والخصوصية</Title>
    {notice?<View style={[s.notice,notice.type==='ok'?s.ok:s.bad]}><Text style={s.noticeText}>{notice.text}</Text></View>:null}
    <Card><Text style={s.label}>الاسم الظاهر</Text><Field value={name} onChangeText={setNameDraft} placeholder="الاسم"/><Text style={s.label}>رقم تسجيل الدخول</Text><View style={s.readonly}><Text style={s.phone}>{phone||'جاري تحميل رقم الحساب…'}</Text></View><Muted>رقم تسجيل الدخول مرتبط بالحساب، لذلك لا يتم تغييره من هنا بالخطأ.</Muted><Button title={busy?'جاري الحفظ…':'حفظ الاسم'} disabled={busy||name.trim().length<2} onPress={save}/></Card>
    <Title>طلبات حذف الحساب</Title>{(deletion.data??[]).map((r:any)=><Card key={r.id}><Text style={{fontWeight:'900',textAlign:'right'}}>الحالة: {r.status}</Text><Muted>{new Date(r.created_at).toLocaleString('ar-EG')}</Muted>{r.admin_note?<Muted>{r.admin_note}</Muted>:null}</Card>)}
    <Card><Field value={reason} onChangeText={setReason} placeholder="سبب الطلب اختياري" multiline/><Button title={busy?'جاري الإرسال…':'طلب حذف الحساب والبيانات'} disabled={busy} onPress={()=>void sendDeletion()}/><Muted>الطلب لا يحذف سجلات الطلبات أو التدقيق فورًا؛ يتم مراجعته لحماية الحقوق والالتزامات التشغيلية.</Muted></Card>
  </Screen>;
}
const s=StyleSheet.create({label:{textAlign:'right',fontWeight:'900',color:'#344054'},readonly:{minHeight:50,borderRadius:15,backgroundColor:'#f2f4f7',justifyContent:'center',paddingHorizontal:14},phone:{textAlign:'right',fontWeight:'800',color:'#475467'},notice:{borderRadius:15,padding:13},ok:{backgroundColor:'#ecfdf3',borderWidth:1,borderColor:'#abefc6'},bad:{backgroundColor:'#fef3f2',borderWidth:1,borderColor:'#fecdca'},noticeText:{textAlign:'right',fontWeight:'800',lineHeight:21,color:'#344054'}});
