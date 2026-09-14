import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Muted, Title, colors } from '@/src/components/ui';
import { getMyFinanceWallets, getWalletEntries } from '@/src/lib/finance';

const labels:Record<string,string>={platform_commission:'عمولة المنصة',merchant_commission:'عمولة التاجر',fleet_platform_commission:'عمولة الشركة للمنصة',fleet_driver_platform_commission:'عمولة منصة على المندوب',topup:'شحن محفظة',admin_adjustment:'تعديل إداري',reward_credit:'رصيد مكافأة',reversal:'عكس حركة'};

export default function Wallet(){
  const wallets=useQuery({queryKey:['finance-wallets'],queryFn:getMyFinanceWallets,refetchInterval:30_000});
  const [selected,setSelected]=useState<string|null>(null);
  const active=useMemo(()=>wallets.data?.find(x=>x.wallet_id===(selected??wallets.data?.[0]?.wallet_id))??null,[wallets.data,selected]);
  const entries=useQuery({queryKey:['finance-ledger',active?.wallet_id],queryFn:()=>getWalletEntries(active!.wallet_id),enabled:Boolean(active?.wallet_id)});
  if(wallets.isLoading)return <View style={s.center}><Muted>جاري تحميل المحفظة…</Muted></View>;
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Title>المحفظة والمحاسبة</Title>
    <Card><Text style={s.explain}>الرصيد الموجب = ليك رصيد/تسوية، والرصد السالب = مديونية مستحقة. لو الإدارة فعّلت حد المديونية ووصلتله، العمليات الجديدة بتقف لحد الشحن أو التسوية.</Text></Card>
    {(wallets.data??[]).length>1?<View style={s.tabs}>{wallets.data!.map(w=><Pressable key={w.wallet_id} onPress={()=>setSelected(w.wallet_id)} style={[s.tab,active?.wallet_id===w.wallet_id&&s.tabActive]}><Text style={[s.tabText,active?.wallet_id===w.wallet_id&&s.tabTextActive]}>{w.owner_label}</Text></Pressable>)}</View>:null}
    {!active?<Card><Muted>لسه مفيش محفظة مرتبطة بحسابك. بتتعمل تلقائي أول ما يبقى عندك نشاط كتاجر أو مندوب أو مدير شركة.</Muted></Card>:<>
      <View style={[s.hero,active.blocked&&s.heroBlocked]}><Text style={s.heroLabel}>{active.owner_label}</Text><Text style={s.balance}>{active.balance.toFixed(2)} ج</Text><Text style={s.heroHint}>{active.enforcement_enabled?`حد المديونية: -${active.debt_limit.toFixed(2)} ج`:'حد المديونية غير مفعّل حاليًا'}</Text><View style={[s.status,active.blocked?s.statusBlocked:s.statusOk]}><Text style={[s.statusText,active.blocked&&s.statusTextBlocked]}>{active.blocked?'موقوف بسبب المديونية':'الحساب المالي سليم'}</Text></View></View>
      <Text style={s.section}>آخر الحركات</Text>
      {(entries.data??[]).length===0?<Card><Muted>مفيش حركات مالية لسه.</Muted></Card>:(entries.data??[]).map(e=><Card key={e.id}><View style={s.row}><View style={s.flex}><Text style={s.entryTitle}>{labels[e.entry_type]??e.entry_type}</Text><Muted>{e.memo||'بدون ملاحظة'} • {new Date(e.created_at).toLocaleString('ar-EG')}</Muted></View><Text style={[s.amount,e.amount<0&&s.amountNegative]}>{e.amount>0?'+':''}{e.amount.toFixed(2)} ج</Text></View></Card>)}
    </>}
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:12,direction:'rtl'},center:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#f5f7fa'},explain:{textAlign:'right',color:'#475467',lineHeight:23},tabs:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},tab:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d0d5dd',borderRadius:999,paddingHorizontal:12,paddingVertical:8},tabActive:{backgroundColor:'#fff4ed',borderColor:colors.primary},tabText:{fontWeight:'800',color:'#475467'},tabTextActive:{color:'#b93815'},hero:{backgroundColor:'#17212f',borderRadius:28,padding:22,gap:8},heroBlocked:{backgroundColor:'#4a1d1f'},heroLabel:{color:'#fdba74',fontWeight:'900',textAlign:'right'},balance:{fontSize:38,fontWeight:'900',color:'#fff',textAlign:'right'},heroHint:{color:'#d0d5dd',textAlign:'right'},status:{alignSelf:'flex-end',paddingHorizontal:10,paddingVertical:5,borderRadius:999},statusOk:{backgroundColor:'#ecfdf3'},statusBlocked:{backgroundColor:'#fef3f2'},statusText:{fontWeight:'900',fontSize:11,color:'#067647'},statusTextBlocked:{color:'#b42318'},section:{fontSize:20,fontWeight:'900',color:'#101828',textAlign:'right'},row:{flexDirection:'row-reverse',gap:10,alignItems:'center'},flex:{flex:1},entryTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},amount:{fontSize:18,fontWeight:'900',color:'#067647'},amountNegative:{color:'#b42318'}});