import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { createServiceArea, getAdminOverview, resolveDeletion, resolveDriverIssue, setRole, setUserActive, toggleServiceArea, updateSetting } from '@/src/lib/adminOps';

export default function AdminOperations(){
  const qc=useQueryClient(); const overview=useQuery({queryKey:['admin-overview'],queryFn:getAdminOverview,refetchInterval:30000});
  const [areaName,setAreaName]=useState(''); const [radius,setRadius]=useState(''); const [busy,setBusy]=useState(false);
  const data=overview.data;
  async function refresh(){await qc.invalidateQueries({queryKey:['admin-overview']});}
  async function setting(key:string,value:unknown){setBusy(true);try{await updateSetting(key,value);await refresh();}catch(e){Alert.alert('تعذر تحديث الإعداد',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  async function addArea(){setBusy(true);try{await createServiceArea({name:areaName,radiusKm:radius?Number(radius):null});setAreaName('');setRadius('');await refresh();}catch(e){Alert.alert('تعذر إضافة المنطقة',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  const maintenance=Boolean(data?.settings.find((x:any)=>x.key==='maintenance_mode')?.value);
  const capacity=Number(data?.settings.find((x:any)=>x.key==='driver_capacity')?.value??5);
  return <Screen>
    <Title>مركز الإدارة</Title>
    <Card><Text style={{fontWeight:'900',textAlign:'right'}}>مؤشرات الاستخدام</Text><Muted>قاعدة البيانات: {formatBytes(Number(data?.metrics?.database_bytes??0))}</Muted><Muted>التخزين: {formatBytes(Number(data?.metrics?.storage_bytes??0))} • ملفات: {Number(data?.metrics?.storage_objects??0)}</Muted><Muted>المستخدمون: {Number(data?.metrics?.auth_users??0)} • النشطون هذا الشهر: {Number(data?.metrics?.mau??0)}</Muted></Card>
    <Title>إعدادات التشغيل</Title><Card><Text style={{fontWeight:'900',textAlign:'right'}}>وضع الصيانة: {maintenance?'مفعّل':'متوقف'}</Text><Button title={maintenance?'إيقاف وضع الصيانة':'تفعيل وضع الصيانة'} disabled={busy} onPress={()=>setting('maintenance_mode',!maintenance)}/><Muted>سعة المندوب الحالية: {capacity} طلبات</Muted><View style={{flexDirection:'row-reverse',gap:8}}><View style={{flex:1}}><Button title="+ سعة" onPress={()=>setting('driver_capacity',Math.min(20,capacity+1))}/></View><View style={{flex:1}}><Button title="- سعة" onPress={()=>setting('driver_capacity',Math.max(1,capacity-1))}/></View></View></Card>
    <Title>مناطق الخدمة</Title><Card><Field value={areaName} onChangeText={setAreaName} placeholder="اسم المنطقة"/><Field value={radius} onChangeText={setRadius} placeholder="نطاق تقريبي بالكيلومتر" keyboardType="decimal-pad"/><Button title="إضافة منطقة" disabled={busy||!areaName.trim()} onPress={addArea}/></Card>{(data?.areas??[]).map((a:any)=><Card key={a.id}><Text style={{fontWeight:'900',textAlign:'right'}}>{a.name}</Text><Muted>{a.radius_km?`${a.radius_km} كم`: 'بدون نصف قطر'} • {a.enabled?'مفعلة':'متوقفة'}</Muted><Button title={a.enabled?'إيقاف المنطقة':'تفعيل المنطقة'} onPress={async()=>{await toggleServiceArea(a.id,!a.enabled);await refresh();}}/></Card>)}
    <Title>المستخدمون</Title>{(data?.profiles??[]).slice(0,50).map((u:any)=><Card key={u.id}><Text style={{fontWeight:'900',textAlign:'right'}}>{u.full_name||'بدون اسم'}</Text><Muted>{u.phone||'بدون هاتف'} • {u.is_active?'نشط':'موقوف'}</Muted><Button title={u.is_active?'إيقاف الحساب':'إعادة تفعيل الحساب'} onPress={async()=>{try{await setUserActive(u.id,!u.is_active);await refresh();}catch(e){Alert.alert('تعذر التنفيذ',e instanceof Error?e.message:'حاول مرة أخرى');}}}/><View style={{gap:6}}><Button title="منح/تأكيد دور عميل" onPress={async()=>{await setRole(u.id,'customer',true);await refresh();}}/><Button title="منح دور مندوب" onPress={async()=>{await setRole(u.id,'driver',true);await refresh();}}/><Button title="منح دور تاجر" onPress={async()=>{await setRole(u.id,'merchant',true);await refresh();}}/></View></Card>)}
    <Title>طلبات حذف الحساب</Title>{(data?.deletions??[]).map((r:any)=><Card key={r.id}><Muted>{r.reason||'بدون سبب'} • {r.status}</Muted><Button title="بدء المعالجة" onPress={async()=>{await resolveDeletion(r.id,'processing');await refresh();}}/><Button title="رفض الطلب" onPress={async()=>{await resolveDeletion(r.id,'rejected','تمت مراجعة الطلب وتعذر تنفيذه حاليًا.');await refresh();}}/></Card>)}
    <Title>بلاغات المندوبين</Title>{(data?.issues??[]).map((i:any)=><Card key={i.id}><Text style={{fontWeight:'900',textAlign:'right'}}>{i.category}</Text><Muted>{i.message}</Muted><Button title="تم الحل" onPress={async()=>{await resolveDriverIssue(i.id,'resolved','تمت مراجعة البلاغ.');await refresh();}}/></Card>)}
    <Title>آخر عمليات التدقيق</Title>{(data?.audit??[]).slice(0,30).map((a:any)=><Card key={a.id}><Text style={{fontWeight:'900',textAlign:'right'}}>{a.action}</Text><Muted>{a.entity_type} • {new Date(a.created_at).toLocaleString('ar-EG')}</Muted></Card>)}
  </Screen>;
}
function formatBytes(value:number){if(!Number.isFinite(value)||value<=0)return '0 B';const units=['B','KB','MB','GB'];let n=value,i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return `${n.toFixed(i?1:0)} ${units[i]}`;}
