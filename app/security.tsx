import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Muted, PasswordField, Screen, Title } from '@/src/components/ui';
import { changePassword } from '@/src/lib/auth';
import { getSecurityStatus, revokeTrustedDevices, setPin, verifyPin } from '@/src/lib/security';

export default function SecurityScreen() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['security-status'], queryFn: getSecurityStatus });
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [newPin, setNewPin] = useState('');
  const [verifyValue, setVerifyValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice,setNotice]=useState<{type:'ok'|'error';text:string}|null>(null);

  async function savePassword(){
    setNotice(null);
    if(newPassword!==confirmPassword){setNotice({type:'error',text:'كلمتا المرور الجديدتان غير متطابقتين.'});return;}
    setBusy(true);
    try{await changePassword(currentPassword,newPassword);setCurrentPassword('');setNewPassword('');setConfirmPassword('');setNotice({type:'ok',text:'تم تغيير كلمة المرور بنجاح. الجلسة الحالية ما زالت آمنة ومفتوحة.'});}
    catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'تعذر تغيير كلمة المرور.'});}
    finally{setBusy(false);}
  }

  async function savePin() {
    setBusy(true);setNotice(null);
    try { await setPin(newPin); setNewPin(''); await qc.invalidateQueries({ queryKey: ['security-status'] }); setNotice({type:'ok',text:'تم حفظ الرقم السري بشكل آمن.'}); }
    catch (e) { setNotice({type:'error',text:e instanceof Error ? e.message : 'تعذر حفظ الرقم السري.'}); }
    finally { setBusy(false); }
  }

  async function checkPin() {
    setBusy(true);setNotice(null);
    try {
      const result = await verifyPin(verifyValue, true);
      setVerifyValue('');
      await qc.invalidateQueries({ queryKey: ['security-status'] });
      if (!result.ok) setNotice({type:'error',text:result.locked_until ? `تم قفل المحاولات مؤقتًا حتى ${new Date(result.locked_until).toLocaleString('ar-EG')}` : 'الرقم السري غير صحيح.'});
      else setNotice({type:'ok',text:'تم التحقق. الجهاز موثوق لمدة 48 ساعة.'});
    } catch (e) { setNotice({type:'error',text:e instanceof Error ? e.message : 'تعذر التحقق.'}); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true);setNotice(null);
    try { const count = await revokeTrustedDevices(); await qc.invalidateQueries({ queryKey: ['security-status'] }); setNotice({type:'ok',text:`تم إلغاء الثقة من ${count} جهاز/جلسة.`}); }
    catch (e) { setNotice({type:'error',text:e instanceof Error ? e.message : 'تعذر التنفيذ.'}); }
    finally { setBusy(false); }
  }

  return <Screen>
    <Title>الأمان وكلمة المرور</Title>
    {notice?<View style={[s.notice,notice.type==='ok'?s.ok:s.bad]}><Text style={s.noticeText}>{notice.text}</Text></View>:null}
    <Card><Text style={s.cardTitle}>تغيير كلمة المرور</Text><Muted>متاح لكل أنواع الحسابات. للتأكد إن صاحب الحساب هو اللي بيغيّرها، اكتب كلمة المرور الحالية أولًا.</Muted><PasswordField value={currentPassword} onChangeText={setCurrentPassword} placeholder="كلمة المرور الحالية"/><PasswordField value={newPassword} onChangeText={setNewPassword} placeholder="كلمة المرور الجديدة — 8 أحرف على الأقل"/><PasswordField value={confirmPassword} onChangeText={setConfirmPassword} placeholder="تأكيد كلمة المرور الجديدة"/><Button title={busy?'جاري التحديث…':'تغيير كلمة المرور'} disabled={busy||currentPassword.length<8||newPassword.length<8||confirmPassword.length<8} onPress={()=>void savePassword()}/></Card>
    <Card>
      <Text style={s.cardTitle}>{status.data?.has_pin ? 'الرقم السري مفعّل' : 'الرقم السري غير مفعّل'}</Text>
      <Muted>{status.data?.device_trusted ? `الجهاز موثوق حتى ${new Date(status.data.trusted_until!).toLocaleString('ar-EG')}` : 'الجهاز غير موثوق حاليًا.'}</Muted>
      {status.data?.last_pin_verified_at ? <Muted>آخر تحقق: {new Date(status.data.last_pin_verified_at).toLocaleString('ar-EG')}</Muted> : null}
    </Card>
    <Card><Text style={s.cardTitle}>الرقم السري للتطبيق</Text><Field secureTextEntry keyboardType="number-pad" maxLength={8} value={newPin} onChangeText={setNewPin} placeholder={status.data?.has_pin ? 'رقم سري جديد (4–8 أرقام)' : 'أنشئ رقمًا سريًا (4–8 أرقام)'} /><Button title={busy ? 'جاري الحفظ…' : 'حفظ الرقم السري'} disabled={busy || newPin.length < 4} onPress={()=>void savePin()} /></Card>
    {status.data?.has_pin ? <Card><Field secureTextEntry keyboardType="number-pad" maxLength={8} value={verifyValue} onChangeText={setVerifyValue} placeholder="أدخل الرقم السري للتحقق" /><Button title={busy ? 'جاري التحقق…' : 'تحقق وثق هذا الجهاز'} disabled={busy || verifyValue.length < 4} onPress={()=>void checkPin()} /><Button title="إلغاء الثقة من كل الأجهزة" disabled={busy} onPress={()=>void revoke()} /></Card> : null}
    <Muted>كلمة المرور والرقم السري لا يتم عرضهما أو تخزينهما كنص قابل للقراءة داخل التطبيق.</Muted>
  </Screen>;
}
const s=StyleSheet.create({cardTitle:{fontWeight:'900',fontSize:17,textAlign:'right',color:'#101828'},notice:{borderRadius:15,padding:13},ok:{backgroundColor:'#ecfdf3',borderWidth:1,borderColor:'#abefc6'},bad:{backgroundColor:'#fef3f2',borderWidth:1,borderColor:'#fecdca'},noticeText:{textAlign:'right',fontWeight:'800',lineHeight:21,color:'#344054'}});
