import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { addServiceArea, getAdminOverview, resolveDeletion, resolveDriverIssue, setUserActive, toggleServiceArea, updateAdPlacement, updateCommercialSettings, updateSetting, updateStoreServiceAccess } from '@/src/lib/adminOps';

export default function AdminConsole(){
  const qc=useQueryClient();
  const overview=useQuery({queryKey:['admin-overview'],queryFn:getAdminOverview,refetchInterval:30000});
  const [areaName,setAreaName]=useState('');
  const [maintenance,setMaintenance]=useState('');
  const data=overview.data;
  const summary=useMemo(()=>{const orders=data?.orders??[];const delivered=orders.filter((x:any)=>x.status==='delivered');const cancelled=orders.filter((x:any)=>['cancelled','rejected'].includes(x.status));return {users:data?.profiles.length??0,stores:data?.stores.length??0,orders:orders.length,revenue:delivered.reduce((s:number,x:any)=>s+Number(x.total??0),0),cancelled:cancelled.length};},[data]);
  async function refresh(){await qc.invalidateQueries({queryKey:['admin-overview']});}
  if(overview.isLoading)return <Screen><Muted>جاري تحميل لوحة الإدارة…</Muted></Screen>;
  if(overview.isError)return <Screen><Title>تعذر تحميل لوحة الإدارة</Title><Muted>{overview.error instanceof Error?overview.error.message:'حاول مرة أخرى'}</Muted></Screen>;
  return <ScrollView style={{flex:1}} contentContainerStyle={{paddingBottom:32}}><Screen>
    <Title>مركز الإدارة</Title>
    <Card><Text style={{textAlign:'right',fontWeight:'900'}}>المؤشرات</Text><Muted>مستخدمون: {summary.users} • متاجر: {summary.stores} • طلبات: {summary.orders}</Muted><Muted>إيراد الطلبات المسلّمة: {summary.revenue.toFixed(2)} ج • ملغي/مرفوض: {summary.cancelled}</Muted><Muted>DB: {formatBytes(Number((data?.metrics as any)?.database_bytes??0))} • Storage: {formatBytes(Number((data?.metrics as any)?.storage_bytes??0))}</Muted></Card>

    {data?.commercial?<CommercialControls key={String(data.commercial.updated_at)} commercial={data.commercial} onSaved={refresh}/>:null}

    <Title>الإعلانات</Title>
    <Muted>3 أماكن فقط للحفاظ على تجربة المستخدم. الإعلانات مقفولة افتراضيًا ولا تظهر في الدفع أو التتبع أو الأذكار.</Muted>
    {(data?.ads??[]).map((ad:any)=><AdPlacementCard key={`${ad.id}-${ad.updated_at}`} ad={ad} onSaved={refresh}/>)}

    <Title>اشتراكات المتاجر</Title>
    {(data?.stores??[]).map((s:any)=>{const access=(data?.storeAccess??[]).find((a:any)=>a.store_id===s.id)??{merchant_service_enabled:true,merchant_plan:'free',merchant_monthly_price:0,cashier_enabled:true,cashier_monthly_price:0};return <StoreAccessCard key={s.id} store={s} access={access} onSaved={refresh}/>;})}

    <Title>المستخدمون</Title>
    {(data?.profiles??[]).slice(0,50).map((u:any)=><Card key={u.id}><Text style={{textAlign:'right',fontWeight:'900'}}>{u.full_name||'بدون اسم'}</Text><Muted>{u.phone||'بدون هاتف'} • {u.is_active?'نشط':'موقوف'}</Muted><Button title={u.is_active?'إيقاف الحساب':'إعادة تفعيل الحساب'} onPress={async()=>{try{await setUserActive(u.id,!u.is_active);await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></Card>)}

    <Title>المناطق الخدمية</Title>
    <Card><Field value={areaName} onChangeText={setAreaName} placeholder="اسم منطقة جديدة"/><Button title="إضافة منطقة" onPress={async()=>{if(!areaName.trim())return;try{await addServiceArea(areaName.trim());setAreaName('');await refresh();}catch(e){Alert.alert('تعذر إضافة المنطقة',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></Card>
    {(data?.areas??[]).map((a:any)=><Card key={a.id}><Text style={{textAlign:'right',fontWeight:'900'}}>{a.name}</Text><Muted>{a.enabled?'مفعلة':'موقوفة'}</Muted><Button title={a.enabled?'إيقاف المنطقة':'تفعيل المنطقة'} onPress={async()=>{try{await toggleServiceArea(a.id,!a.enabled);await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></Card>)}

    <Title>وضع الصيانة</Title>
    <Card><Field value={maintenance} onChangeText={setMaintenance} placeholder="رسالة الصيانة أو اتركها فارغة"/><View style={{gap:8}}><Button title="تفعيل الصيانة" onPress={async()=>{try{await updateSetting('maintenance_mode',{enabled:true,message:maintenance.trim()});await refresh();}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}}/><Button title="إيقاف الصيانة" onPress={async()=>{try{await updateSetting('maintenance_mode',{enabled:false,message:''});await refresh();}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></View></Card>

    <Title>طلبات حذف البيانات</Title>
    {(data?.deletions??[]).map((r:any)=><Card key={r.id}><Muted>{r.reason||'بدون سبب'} • {r.status}</Muted><Button title="بدء المعالجة" onPress={async()=>{try{await resolveDeletion(r.id,'processing');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/><Button title="تم التنفيذ" onPress={async()=>{try{await resolveDeletion(r.id,'completed','تم تنفيذ الطلب الإداري.');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></Card>)}

    <Title>بلاغات المندوبين</Title>
    {(data?.issues??[]).map((r:any)=><Card key={r.id}><Text style={{textAlign:'right',fontWeight:'900'}}>{r.category}</Text><Muted>{r.message}</Muted><Button title="تم الحل" onPress={async()=>{try{await resolveDriverIssue(r.id,'resolved','تمت مراجعة البلاغ.');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></Card>)}

    <Title>آخر الأحداث الحساسة</Title>
    {(data?.audit??[]).slice(0,30).map((a:any)=><Card key={a.id}><Text style={{textAlign:'right',fontWeight:'900'}}>{a.action}</Text><Muted>{a.entity_type} • {a.entity_id??'-'} • {new Date(a.created_at).toLocaleString('ar-EG')}</Muted></Card>)}
  </Screen></ScrollView>;
}

function CommercialControls({commercial,onSaved}:{commercial:any;onSaved:()=>Promise<unknown>}){
  const [merchantPrice,setMerchantPrice]=useState(String(Number(commercial.merchant_default_monthly_price??0)));const [cashierPrice,setCashierPrice]=useState(String(Number(commercial.cashier_default_monthly_price??0)));const [driverCommission,setDriverCommission]=useState(String(Number(commercial.driver_platform_commission_percent??0)));const [merchantRequired,setMerchantRequired]=useState(Boolean(commercial.merchant_subscription_required));const [cashierRequired,setCashierRequired]=useState(Boolean(commercial.cashier_subscription_required));
  async function save(){try{const mp=Number(merchantPrice),cp=Number(cashierPrice),dc=Number(driverCommission);if([mp,cp,dc].some(x=>!Number.isFinite(x))||mp<0||cp<0||dc<0||dc>100)throw new Error('راجع الأسعار ونسبة المندوب.');await updateCommercialSettings({merchantSubscriptionRequired:merchantRequired,merchantDefaultMonthlyPrice:mp,cashierSubscriptionRequired:cashierRequired,cashierDefaultMonthlyPrice:cp,driverPlatformCommissionPercent:dc});await onSaved();Alert.alert('تم الحفظ','تم تحديث الإعدادات التجارية.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <><Title>الاشتراكات والعمولات</Title><Card><Muted>الافتراضي الحالي مجاني: اشتراكات غير مطلوبة، أسعار 0، وعمولة المنصة من المندوب 0%.</Muted><Field value={merchantPrice} onChangeText={setMerchantPrice} keyboardType="decimal-pad" placeholder="سعر اشتراك التاجر الشهري"/><Button title={merchantRequired?'اشتراك التاجر: مطلوب':'اشتراك التاجر: مجاني/غير مطلوب'} onPress={()=>setMerchantRequired(v=>!v)}/><Field value={cashierPrice} onChangeText={setCashierPrice} keyboardType="decimal-pad" placeholder="سعر اشتراك الكاشير الشهري"/><Button title={cashierRequired?'اشتراك الكاشير: مطلوب':'اشتراك الكاشير: مجاني/غير مطلوب'} onPress={()=>setCashierRequired(v=>!v)}/><Field value={driverCommission} onChangeText={setDriverCommission} keyboardType="decimal-pad" placeholder="نسبة خصم المنصة من رسوم المندوب %"/><Button title="حفظ الإعدادات التجارية" onPress={save}/></Card></>;
}

function AdPlacementCard({ad,onSaved}:{ad:any;onSaved:()=>Promise<unknown>}){
  const [enabled,setEnabled]=useState(Boolean(ad.enabled));const [provider,setProvider]=useState<'direct'|'google'|'other'>(ad.provider??'direct');const [platform,setPlatform]=useState<'all'|'android'|'ios'|'web'>(ad.platform??'all');const [mediaUrl,setMediaUrl]=useState(ad.media_url??'');const [targetUrl,setTargetUrl]=useState(ad.target_url??'');const [googleId,setGoogleId]=useState(ad.google_ad_unit_id??'');const [priority,setPriority]=useState(String(ad.priority??0));
  async function save(){try{await updateAdPlacement({placementKey:ad.placement_key,enabled,provider,platform,mediaUrl,targetUrl,googleAdUnitId:googleId,priority:Number(priority)||0});await onSaved();Alert.alert('تم','تم تحديث مكان الإعلان.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <Card><Text style={{textAlign:'right',fontWeight:'900'}}>{ad.title}</Text><Muted>{ad.description}</Muted><Button title={enabled?'الإعلان: مفعّل':'الإعلان: موقوف'} onPress={()=>setEnabled(v=>!v)}/><View style={{flexDirection:'row-reverse',gap:6,flexWrap:'wrap'}}>{(['direct','google','other'] as const).map(x=><Button key={x} title={`${provider===x?'✓ ':''}${x==='direct'?'مباشر':x==='google'?'Google':'شبكة أخرى'}`} onPress={()=>setProvider(x)}/> )}</View><View style={{flexDirection:'row-reverse',gap:6,flexWrap:'wrap'}}>{(['all','android','ios','web'] as const).map(x=><Button key={x} title={`${platform===x?'✓ ':''}${x}`} onPress={()=>setPlatform(x)}/> )}</View><Field value={mediaUrl} onChangeText={setMediaUrl} placeholder="رابط صورة / GIF / WebP للإعلان المباشر"/><Field value={targetUrl} onChangeText={setTargetUrl} placeholder="الرابط عند الضغط"/><Field value={googleId} onChangeText={setGoogleId} placeholder="Google Ad Unit ID عند التفعيل مستقبلًا"/><Field value={priority} onChangeText={setPriority} keyboardType="number-pad" placeholder="الأولوية"/><Button title="حفظ مكان الإعلان" onPress={save}/></Card>;
}

function StoreAccessCard({store,access,onSaved}:{store:any;access:any;onSaved:()=>Promise<unknown>}){const [merchantEnabled,setMerchantEnabled]=useState(Boolean(access.merchant_service_enabled));const [cashierEnabled,setCashierEnabled]=useState(Boolean(access.cashier_enabled));const [plan,setPlan]=useState(String(access.merchant_plan??'free'));const [merchantPrice,setMerchantPrice]=useState(String(Number(access.merchant_monthly_price??0)));const [cashierPrice,setCashierPrice]=useState(String(Number(access.cashier_monthly_price??0)));async function save(){try{await updateStoreServiceAccess({storeId:store.id,merchantServiceEnabled:merchantEnabled,merchantPlan:plan||'free',merchantMonthlyPrice:Number(merchantPrice)||0,cashierEnabled,cashierMonthlyPrice:Number(cashierPrice)||0,merchantSubscriptionExpiresAt:access.merchant_subscription_expires_at??null,cashierSubscriptionExpiresAt:access.cashier_subscription_expires_at??null});await onSaved();Alert.alert('تم','تم تحديث خدمات المتجر.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}return <Card><Text style={{textAlign:'right',fontWeight:'900'}}>{store.name}</Text><Muted>خدمة المنصة: {merchantEnabled?'مفعلة':'موقوفة'} • الكاشير: {cashierEnabled?'مفعّل':'موقوف'}</Muted><Field value={plan} onChangeText={setPlan} placeholder="الخطة: free / basic / pro"/><Field value={merchantPrice} onChangeText={setMerchantPrice} keyboardType="decimal-pad" placeholder="سعر اشتراك المتجر"/><Button title={merchantEnabled?'إيقاف خدمة المتجر':'تفعيل خدمة المتجر'} onPress={()=>setMerchantEnabled(v=>!v)}/><Field value={cashierPrice} onChangeText={setCashierPrice} keyboardType="decimal-pad" placeholder="سعر الكاشير لهذا المتجر"/><Button title={cashierEnabled?'إيقاف الكاشير لهذا المتجر':'تفعيل الكاشير لهذا المتجر'} onPress={()=>setCashierEnabled(v=>!v)}/><Button title="حفظ إعدادات المتجر" onPress={save}/></Card>;}
function formatBytes(n:number){if(!Number.isFinite(n)||n<=0)return '0 B';const units=['B','KB','MB','GB'];let i=0;let v=n;while(v>=1024&&i<units.length-1){v/=1024;i++;}return `${v.toFixed(i?1:0)} ${units[i]}`;}
