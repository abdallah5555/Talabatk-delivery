import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { simulateDeliveryFee, updateDeliveryPricing } from '@/src/lib/pricing';

const n=(value:unknown,fallback=0)=>{const x=Number(value);return Number.isFinite(x)?x:fallback;};

async function getPricingSettings(){
  const {data,error}=await supabase.from('platform_commercial_settings').select('*').eq('id','global').single();
  if(error)throw error;
  return data as any;
}

export default function AdminPricing(){
  const qc=useQueryClient();
  const query=useQuery({queryKey:['delivery-pricing-settings'],queryFn:getPricingSettings});
  const s=query.data;
  const[busy,setBusy]=useState(false);
  const[enabled,setEnabled]=useState<boolean|null>(null);
  const[draft,setDraft]=useState<Record<string,string>>({});
  const val=(key:string,fallback:number)=>draft[key]??String(s?.[key]??fallback);
  const previewSettings=useMemo(()=>({...s,
    delivery_base_fee:n(val('delivery_base_fee',35)),delivery_min_fee:n(val('delivery_min_fee',40)),delivery_included_km:n(val('delivery_included_km',3)),delivery_per_extra_km:n(val('delivery_per_extra_km',5)),delivery_per_minute:n(val('delivery_per_minute',.5)),delivery_avg_speed_kmh:n(val('delivery_avg_speed_kmh',22)),delivery_max_fee:n(val('delivery_max_fee',250)),delivery_round_step:n(val('delivery_round_step',5)),
  }),[s,draft]);
  const set=(key:string,value:string)=>setDraft(x=>({...x,[key]:value}));
  async function save(){if(!s)return;setBusy(true);try{
    await updateDeliveryPricing({
      enabled:enabled??Boolean(s.delivery_pricing_enabled),
      baseFee:n(val('delivery_base_fee',35)),minFee:n(val('delivery_min_fee',40)),includedKm:n(val('delivery_included_km',3)),perExtraKm:n(val('delivery_per_extra_km',5)),perMinute:n(val('delivery_per_minute',.5)),roadFactor:n(val('delivery_road_factor',1.25)),avgSpeed:n(val('delivery_avg_speed_kmh',22)),maxServiceKm:n(val('delivery_max_service_km',30)),maxFee:n(val('delivery_max_fee',250)),roundStep:n(val('delivery_round_step',5)),
    });
    await qc.invalidateQueries({queryKey:['delivery-pricing-settings']});setDraft({});setEnabled(null);Alert.alert('تم الحفظ','تم تحديث محرك سعر التوصيل من السيرفر.');
  }catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'راجع القيم وحاول مرة أخرى.');}finally{setBusy(false);}}
  if(query.isLoading)return <View style={st.center}><Muted>جاري تحميل نظام التسعير…</Muted></View>;
  if(query.isError)return <View style={st.center}><Title>تعذر تحميل التسعير</Title><Muted>{query.error instanceof Error?query.error.message:'حاول مرة أخرى'}</Muted></View>;
  const active=enabled??Boolean(s.delivery_pricing_enabled);
  return <ScrollView style={st.page} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
    <View style={st.hero}><Text style={st.kicker}>UPFRONT DELIVERY PRICING</Text><Text style={st.heroTitle}>محرك سعر التوصيل</Text><Text style={st.heroText}>السعر يتحسب على السيرفر قبل إنشاء الطلب، ويتخزن Snapshot للمراجعة. التوصيل المجاني للعميل لا يلغي حق المندوب: أجر المندوب الأصلي محفوظ منفصلًا.</Text></View>
    <Card><View style={st.row}><View style={st.flex}><Text style={st.cardTitle}>التسعير الذكي</Text><Muted>{active?'مفعّل: حد أدنى + مسافة + وقت تقديري':'موقوف: رسوم المتجر الثابتة'}</Muted></View><Button title={active?'إيقاف':'تفعيل'} onPress={()=>setEnabled(!active)}/></View></Card>
    <Text style={st.section}>المعادلة الأساسية</Text>
    <Card>
      <Field accessibilityLabel="رسوم البداية" placeholder="رسوم البداية" value={val('delivery_base_fee',35)} onChangeText={v=>set('delivery_base_fee',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="الحد الأدنى" placeholder="الحد الأدنى للسعر" value={val('delivery_min_fee',40)} onChangeText={v=>set('delivery_min_fee',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="كيلومترات مشمولة" placeholder="كيلومترات مشمولة" value={val('delivery_included_km',3)} onChangeText={v=>set('delivery_included_km',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="سعر الكيلومتر الإضافي" placeholder="سعر الكيلومتر الإضافي" value={val('delivery_per_extra_km',5)} onChangeText={v=>set('delivery_per_extra_km',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="سعر الدقيقة" placeholder="سعر الدقيقة التقديرية" value={val('delivery_per_minute',.5)} onChangeText={v=>set('delivery_per_minute',v)} keyboardType="decimal-pad"/>
      <Muted>الصيغة: رسوم بداية + المسافة بعد الكيلومترات المشمولة + وقت قيادة تقديري، وبعدها تطبيق الحد الأدنى والأقصى والتقريب.</Muted>
    </Card>
    <Text style={st.section}>ضبط المسافة والوقت</Text>
    <Card>
      <Field accessibilityLabel="معامل الطريق" placeholder="معامل الطريق" value={val('delivery_road_factor',1.25)} onChangeText={v=>set('delivery_road_factor',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="السرعة المتوسطة" placeholder="متوسط السرعة كم/س" value={val('delivery_avg_speed_kmh',22)} onChangeText={v=>set('delivery_avg_speed_kmh',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="أقصى مسافة خدمة" placeholder="أقصى مسافة خدمة كم" value={val('delivery_max_service_km',30)} onChangeText={v=>set('delivery_max_service_km',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="أقصى سعر" placeholder="أقصى سعر توصيل" value={val('delivery_max_fee',250)} onChangeText={v=>set('delivery_max_fee',v)} keyboardType="decimal-pad"/>
      <Field accessibilityLabel="خطوة التقريب" placeholder="التقريب لأقرب كام جنيه" value={val('delivery_round_step',5)} onChangeText={v=>set('delivery_round_step',v)} keyboardType="decimal-pad"/>
      <Muted>معامل الطريق 1.25 يعوض إن المسافة على الشوارع غالبًا أطول من الخط المستقيم. لو العنوان أو المتجر مفيهوش إحداثيات، النظام يستخدم Safe Fallback بدل ما يطلع سعر غلط.</Muted>
    </Card>
    <Text style={st.section}>محاكاة قبل الحفظ</Text>
    <View style={st.grid}>{[1,3,5,10,15,20].map(km=><View key={km} style={st.sim}><Text style={st.simKm}>{km} كم</Text><Text style={st.simPrice}>{simulateDeliveryFee(previewSettings,km).toFixed(0)} ج</Text></View>)}</View>
    <View style={st.note}><Text style={st.noteTitle}>مهم للمحاسبة</Text><Text style={st.noteText}>السعر الظاهر للعميل = سعر Upfront. أجر المندوب بيتحفظ وقت إنشاء الطلب ولا يتأثر لو العميل استخدم مكافأة توصيل مجاني. عمولة المنصة والشركة تتطبق بعد كده على أجر المندوب المحفوظ.</Text></View>
    <Button title={busy?'جاري الحفظ…':'حفظ نظام التسعير'} disabled={busy} onPress={()=>void save()}/>
  </ScrollView>;
}
const st=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fb'},content:{padding:18,paddingBottom:50,gap:13,direction:'rtl'},center:{flex:1,justifyContent:'center',padding:28,backgroundColor:'#f5f7fb'},hero:{backgroundColor:'#101828',borderRadius:30,padding:23,gap:8},kicker:{color:'#fdb022',fontWeight:'900',fontSize:11,textAlign:'right'},heroTitle:{color:'#fff',fontSize:29,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',lineHeight:22,textAlign:'right'},section:{fontSize:21,fontWeight:'900',color:'#101828',textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'center',gap:10},flex:{flex:1},cardTitle:{fontWeight:'900',fontSize:17,color:'#344054',textAlign:'right'},grid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},sim:{width:'31%',backgroundColor:'#fff',borderWidth:1,borderColor:'#eaecf0',borderRadius:18,padding:13},simKm:{fontSize:11,color:'#667085',textAlign:'right'},simPrice:{fontSize:21,fontWeight:'900',color:colors.primary,textAlign:'right',marginTop:4},note:{backgroundColor:'#fffaeb',borderWidth:1,borderColor:'#fedf89',borderRadius:18,padding:15,gap:4},noteTitle:{color:'#93370d',fontWeight:'900',textAlign:'right'},noteText:{color:'#93370d',fontSize:12,lineHeight:20,textAlign:'right'}});
