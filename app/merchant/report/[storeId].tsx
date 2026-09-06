import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { getMerchantMenu } from '@/src/lib/merchantOps';
import { createPosSale, getMerchantReport } from '@/src/lib/merchantReports';

export default function MerchantReport(){
  const {storeId}=useLocalSearchParams<{storeId:string}>(); const qc=useQueryClient();
  const report=useQuery({queryKey:['merchant-report',storeId],queryFn:()=>getMerchantReport(storeId!),enabled:Boolean(storeId)});
  const menu=useQuery({queryKey:['merchant-menu',storeId],queryFn:()=>getMerchantMenu(storeId!),enabled:Boolean(storeId)});
  const [qty,setQty]=useState<Record<string,number>>({}); const [note,setNote]=useState(''); const [busy,setBusy]=useState(false);
  const selected=useMemo(()=>Object.entries(qty).filter(([,q])=>q>0).map(([menuItemId,quantity])=>({menuItemId,quantity})),[qty]);
  async function sale(){setBusy(true);try{await createPosSale(storeId!,selected,note);setQty({});setNote('');await qc.invalidateQueries({queryKey:['merchant-report',storeId]});Alert.alert('تم','تم تسجيل البيع وحساب الإجمالي من الأسعار الحالية على السيرفر.');}catch(e){Alert.alert('تعذر تسجيل البيع',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  return <Screen>
    <Title>التقارير ونقطة البيع</Title>
    <Card><Text style={{textAlign:'right',fontWeight:'900',fontSize:20}}>إجمالي الإيراد المسجل: {(report.data?.totalRevenue??0).toFixed(2)} ج</Text><Muted>طلبات التوصيل: {(report.data?.deliveryRevenue??0).toFixed(2)} ج • مبيعات الكاونتر: {(report.data?.posRevenue??0).toFixed(2)} ج</Muted><Muted>طلبات: {report.data?.orderCount??0} • مكتمل: {report.data?.deliveredCount??0}</Muted></Card>
    <Title>توزيع الحالات</Title><Card>{Object.entries(report.data?.statusCounts??{}).map(([status,count])=><Muted key={status}>{status}: {count}</Muted>)}</Card>
    <Title>الأكثر مبيعًا</Title>{(report.data?.bestProducts??[]).map(([name,data]:any)=><Card key={name}><Text style={{textAlign:'right',fontWeight:'900'}}>{name}</Text><Muted>{data.quantity} وحدة • {Number(data.revenue).toFixed(2)} ج</Muted></Card>)}
    <Title>بيع يدوي / POS</Title><Muted>اختر الكميات. السعر والإجمالي النهائيان يُحسبان من قاعدة البيانات.</Muted>
    {(menu.data??[]).filter((m:any)=>m.is_available).map((m:any)=><Card key={m.id}><Text style={{textAlign:'right',fontWeight:'900'}}>{m.name} • {m.price.toFixed(2)} ج</Text><View style={{flexDirection:'row-reverse',gap:8,alignItems:'center'}}><View style={{flex:1}}><Button title="+" onPress={()=>setQty(q=>({...q,[m.id]:(q[m.id]??0)+1}))}/></View><Text>{qty[m.id]??0}</Text><View style={{flex:1}}><Button title="-" onPress={()=>setQty(q=>({...q,[m.id]:Math.max(0,(q[m.id]??0)-1)}))}/></View></View></Card>)}
    <Field value={note} onChangeText={setNote} placeholder="ملاحظة البيع اختياري"/><Button title={busy?'جاري التسجيل…':'تسجيل البيع'} disabled={busy||!selected.length} onPress={sale}/>
  </Screen>;
}
