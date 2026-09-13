import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Title } from '@/src/components/ui';
import { getAdminOverview, updateAdPlacement, updateCommercialSettings, updateStoreServiceAccess } from '@/src/lib/adminOps';

export default function AdminCommerce(){
  const qc=useQueryClient();
  const overview=useQuery({queryKey:['admin-overview'],queryFn:getAdminOverview,staleTime:30_000});
  async function refresh(){await qc.invalidateQueries({queryKey:['admin-overview']});}
  if(overview.isLoading)return <View style={s.center}><Muted>جاري تحميل الإعدادات التجارية…</Muted></View>;
  if(overview.isError)return <View style={s.center}><Title>تعذر تحميل الإعدادات</Title><Muted>{overview.error instanceof Error?overview.error.message:'حاول مرة أخرى'}</Muted><Button title="إعادة المحاولة" onPress={()=>void overview.refetch()}/></View>;
  const data=overview.data!;
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.kicker}>BUSINESS CONTROL</Text><Text style={s.heroTitle}>الاشتراكات والعمولات</Text><Text style={s.heroText}>قسم مستقل لإدارة الأسعار والخدمات والإعلانات بدل تكديسها في الصفحة الرئيسية للإدارة.</Text></View>
    {data.commercial?<CommercialControls commercial={data.commercial} onSaved={refresh}/>:null}
    <Text style={s.section}>خدمات المتاجر</Text>
    {(data.stores??[]).map((store:any)=>{const access=(data.storeAccess??[]).find((x:any)=>x.store_id===store.id)??{merchant_service_enabled:true,merchant_plan:'free',merchant_monthly_price:0,cashier_enabled:true,cashier_monthly_price:0};return <StoreCard key={store.id} store={store} access={access} onSaved={refresh}/>;})}
    <Text style={s.section}>الإعلانات</Text>
    <Muted>أماكن الإعلانات منفصلة عن الدفع والتتبع والأذكار، ومقفولة افتراضيًا.</Muted>
    {(data.ads??[]).map((ad:any)=><AdCard key={`${ad.id}-${ad.updated_at}`} ad={ad} onSaved={refresh}/>)}
  </ScrollView>;
}

function CommercialControls({commercial,onSaved}:{commercial:any;onSaved:()=>Promise<unknown>}){
  const [merchantPrice,setMerchantPrice]=useState(String(Number(commercial.merchant_default_monthly_price??0)));
  const [cashierPrice,setCashierPrice]=useState(String(Number(commercial.cashier_default_monthly_price??0)));
  const [driverCommission,setDriverCommission]=useState(String(Number(commercial.driver_platform_commission_percent??0)));
  const [merchantRequired,setMerchantRequired]=useState(Boolean(commercial.merchant_subscription_required));
  const [cashierRequired,setCashierRequired]=useState(Boolean(commercial.cashier_subscription_required));
  async function save(){try{const mp=Number(merchantPrice),cp=Number(cashierPrice),dc=Number(driverCommission);if([mp,cp,dc].some(x=>!Number.isFinite(x))||mp<0||cp<0||dc<0||dc>100)throw new Error('راجع الأسعار ونسبة العمولة.');await updateCommercialSettings({merchantSubscriptionRequired:merchantRequired,merchantDefaultMonthlyPrice:mp,cashierSubscriptionRequired:cashierRequired,cashierDefaultMonthlyPrice:cp,driverPlatformCommissionPercent:dc});await onSaved();Alert.alert('تم الحفظ','تم تحديث الاشتراكات والعمولات.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <Card><View style={s.good}><Text style={s.goodText}>الوضع الحالي مجاني • عمولة المنصة من المندوب {driverCommission}%</Text></View><Text style={s.cardTitle}>اشتراك التاجر</Text><Field value={merchantPrice} onChangeText={setMerchantPrice} keyboardType="decimal-pad" placeholder="السعر الشهري"/><Button title={merchantRequired?'الاشتراك مطلوب':'مجاني حاليًا'} onPress={()=>setMerchantRequired(v=>!v)}/><Text style={s.cardTitle}>خدمة الكاشير</Text><Field value={cashierPrice} onChangeText={setCashierPrice} keyboardType="decimal-pad" placeholder="السعر الشهري"/><Button title={cashierRequired?'اشتراك الكاشير مطلوب':'الكاشير مجاني حاليًا'} onPress={()=>setCashierRequired(v=>!v)}/><Text style={s.cardTitle}>عمولة المنصة من المندوب %</Text><Field value={driverCommission} onChangeText={setDriverCommission} keyboardType="decimal-pad" placeholder="0"/><Button title="حفظ الإعدادات" onPress={save}/></Card>;
}

function StoreCard({store,access,onSaved}:{store:any;access:any;onSaved:()=>Promise<unknown>}){
  const [merchantEnabled,setMerchantEnabled]=useState(Boolean(access.merchant_service_enabled));const [cashierEnabled,setCashierEnabled]=useState(Boolean(access.cashier_enabled));const [plan,setPlan]=useState(String(access.merchant_plan??'free'));const [merchantPrice,setMerchantPrice]=useState(String(Number(access.merchant_monthly_price??0)));const [cashierPrice,setCashierPrice]=useState(String(Number(access.cashier_monthly_price??0)));
  async function save(){try{await updateStoreServiceAccess({storeId:store.id,merchantServiceEnabled:merchantEnabled,merchantPlan:plan||'free',merchantMonthlyPrice:Number(merchantPrice)||0,cashierEnabled,cashierMonthlyPrice:Number(cashierPrice)||0,merchantSubscriptionExpiresAt:access.merchant_subscription_expires_at??null,cashierSubscriptionExpiresAt:access.cashier_subscription_expires_at??null});await onSaved();Alert.alert('تم','تم تحديث خدمات المتجر.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <Card><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>{store.name}</Text><Muted>{merchantEnabled?'خدمة المتجر مفعلة':'خدمة المتجر موقوفة'} • {cashierEnabled?'الكاشير مفعّل':'الكاشير موقوف'}</Muted></View><Text style={merchantEnabled?s.on:s.off}>{merchantEnabled?'● نشط':'● موقوف'}</Text></View><Field value={plan} onChangeText={setPlan} placeholder="الخطة — free / basic / pro"/><View style={s.two}><View style={s.flex}><Field value={merchantPrice} onChangeText={setMerchantPrice} keyboardType="decimal-pad" placeholder="سعر المتجر"/></View><View style={s.flex}><Field value={cashierPrice} onChangeText={setCashierPrice} keyboardType="decimal-pad" placeholder="سعر الكاشير"/></View></View><Button title={merchantEnabled?'إيقاف خدمة المتجر':'تفعيل خدمة المتجر'} onPress={()=>setMerchantEnabled(v=>!v)}/><Button title={cashierEnabled?'إيقاف الكاشير':'تفعيل الكاشير'} onPress={()=>setCashierEnabled(v=>!v)}/><Button title="حفظ" onPress={save}/></Card>;
}

function AdCard({ad,onSaved}:{ad:any;onSaved:()=>Promise<unknown>}){
  const [enabled,setEnabled]=useState(Boolean(ad.enabled));const [provider,setProvider]=useState<'direct'|'google'|'other'>(ad.provider??'direct');const [mediaUrl,setMediaUrl]=useState(ad.media_url??'');const [targetUrl,setTargetUrl]=useState(ad.target_url??'');const [googleId,setGoogleId]=useState(ad.google_ad_unit_id??'');
  async function save(){try{await updateAdPlacement({placementKey:ad.placement_key,enabled,provider,platform:ad.platform??'all',mediaUrl,targetUrl,googleAdUnitId:googleId,priority:Number(ad.priority)||0});await onSaved();Alert.alert('تم','تم تحديث الإعلان.');}catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <Card><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>{ad.title}</Text><Muted>{ad.description}</Muted></View><Text style={enabled?s.on:s.off}>{enabled?'● مفعّل':'● موقوف'}</Text></View><View style={s.providers}>{(['direct','google','other'] as const).map(x=><Pressable key={x} onPress={()=>setProvider(x)} style={[s.provider,provider===x&&s.providerActive]}><Text style={provider===x?s.providerTextActive:s.providerText}>{x==='direct'?'مباشر':x==='google'?'Google':'أخرى'}</Text></Pressable>)}</View>{provider==='direct'?<><Field value={mediaUrl} onChangeText={setMediaUrl} placeholder="رابط الصورة"/><Field value={targetUrl} onChangeText={setTargetUrl} placeholder="الرابط عند الضغط"/></>:null}{provider==='google'?<Field value={googleId} onChangeText={setGoogleId} placeholder="Google Ad Unit ID"/>:null}<Button title={enabled?'إيقاف المكان':'تفعيل المكان'} onPress={()=>setEnabled(v=>!v)}/><Button title="حفظ الإعلان" onPress={save}/></Card>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fb'},content:{padding:20,paddingBottom:40,gap:14},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:12},hero:{backgroundColor:'#101828',borderRadius:26,padding:22,gap:8},kicker:{color:'#fdb022',fontWeight:'900',fontSize:12,letterSpacing:.7},heroTitle:{color:'#fff',fontSize:28,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:14,lineHeight:22,textAlign:'right'},section:{fontSize:21,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:8},good:{backgroundColor:'#ecfdf3',borderRadius:14,padding:12,marginBottom:8},goodText:{color:'#067647',fontWeight:'800',textAlign:'right'},cardTitle:{fontSize:16,fontWeight:'900',color:'#101828',textAlign:'right',marginBottom:6},row:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1},two:{flexDirection:'row',gap:10},on:{color:'#067647',fontWeight:'800'},off:{color:'#b42318',fontWeight:'800'},providers:{flexDirection:'row',gap:8,marginVertical:8},provider:{flex:1,padding:10,borderRadius:12,backgroundColor:'#f2f4f7',alignItems:'center'},providerActive:{backgroundColor:'#fff0e8',borderWidth:1,borderColor:'#f97316'},providerText:{color:'#667085',fontWeight:'700'},providerTextActive:{color:'#c2410c',fontWeight:'900'}});
