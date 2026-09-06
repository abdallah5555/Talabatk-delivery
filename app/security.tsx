import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getSecurityStatus, revokeTrustedDevices, setPin, verifyPin } from '@/src/lib/security';

export default function SecurityScreen() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ['security-status'], queryFn: getSecurityStatus });
  const [newPin, setNewPin] = useState('');
  const [verifyValue, setVerifyValue] = useState('');
  const [busy, setBusy] = useState(false);

  async function savePin() {
    setBusy(true);
    try {
      await setPin(newPin);
      setNewPin('');
      await qc.invalidateQueries({ queryKey: ['security-status'] });
      Alert.alert('تم', 'تم حفظ الرقم السري بشكل آمن.');
    } catch (e) { Alert.alert('تعذر الحفظ', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }

  async function checkPin() {
    setBusy(true);
    try {
      const result = await verifyPin(verifyValue, true);
      setVerifyValue('');
      await qc.invalidateQueries({ queryKey: ['security-status'] });
      if (!result.ok) Alert.alert('الرقم غير صحيح', result.locked_until ? `تم قفل المحاولات مؤقتًا حتى ${new Date(result.locked_until).toLocaleString('ar-EG')}` : 'حاول مرة أخرى.');
      else Alert.alert('تم التحقق', 'الجهاز موثوق لمدة 48 ساعة.');
    } catch (e) { Alert.alert('تعذر التحقق', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true);
    try {
      const count = await revokeTrustedDevices();
      await qc.invalidateQueries({ queryKey: ['security-status'] });
      Alert.alert('تم إلغاء الثقة', `تم إلغاء ${count} جهاز/جلسة موثوقة.`);
    } catch (e) { Alert.alert('تعذر التنفيذ', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }

  return <Screen>
    <Title>الأمان</Title>
    <Card>
      <Text style={{ fontWeight: '900', textAlign: 'right' }}>{status.data?.has_pin ? 'الرقم السري مفعّل' : 'الرقم السري غير مفعّل'}</Text>
      <Muted>{status.data?.device_trusted ? `الجهاز موثوق حتى ${new Date(status.data.trusted_until!).toLocaleString('ar-EG')}` : 'الجهاز غير موثوق حاليًا.'}</Muted>
      {status.data?.last_pin_verified_at ? <Muted>آخر تحقق: {new Date(status.data.last_pin_verified_at).toLocaleString('ar-EG')}</Muted> : null}
    </Card>
    <Card>
      <Field secureTextEntry keyboardType="number-pad" maxLength={8} value={newPin} onChangeText={setNewPin} placeholder={status.data?.has_pin ? 'رقم سري جديد (4–8 أرقام)' : 'أنشئ رقمًا سريًا (4–8 أرقام)'} />
      <Button title={busy ? 'جاري الحفظ…' : 'حفظ الرقم السري'} disabled={busy || newPin.length < 4} onPress={savePin} />
    </Card>
    {status.data?.has_pin ? <Card>
      <Field secureTextEntry keyboardType="number-pad" maxLength={8} value={verifyValue} onChangeText={setVerifyValue} placeholder="أدخل الرقم السري للتحقق" />
      <Button title={busy ? 'جاري التحقق…' : 'تحقق وثق هذا الجهاز'} disabled={busy || verifyValue.length < 4} onPress={checkPin} />
      <Button title="إلغاء الثقة من كل الأجهزة" disabled={busy} onPress={revoke} />
    </Card> : null}
    <Muted>الرقم السري نفسه لا يتم إرساله أو تخزينه كنص قابل للقراءة؛ التحقق يتم داخل قاعدة البيانات فقط.</Muted>
  </Screen>;
}
