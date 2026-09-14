import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Muted, Title, colors } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { getMyRewardEvents, getMyRewardRedemptions, getMyRewards, getRewardCatalog, redeemReward, rewardLevel, type RewardRole } from '@/src/lib/rewards';

const eventLabel:Record<string,string>={order_delivered:'طلب مكتمل',driver_delivery:'توصيل مكتمل',merchant_order:'طلب متجر مكتمل',referral_referrer:'دعوة مستخدم جديد',referral_referred:'مكافأة التسجيل بدعوة',admin_adjustment:'تعديل على النقاط',reward_redemption:'استبدال مكافأة'};
const rewardTypeLabel:Record<string,string>={free_delivery:'توصيل مجاني للطلب القادم',commission_free_next_order:'العملية القادمة بدون عمولة منصة',priority_badge:'ميزة أولوية',custom:'مكافأة خاصة'};
const roleTitle:Record<RewardRole,string>={customer:'مكافآت العميل',driver:'مكافآت المندوب',merchant:'مكافآت التاجر'};
const roleExplain:Record<RewardRole,string>={
  customer:'طلباتك المكتملة بتزود نقاطك. تقدر تستبدل النقاط بجوايز مخصصة للعميل، ومنها توصيل مجاني للطلب القادم لما تكون الجائزة متاحة.',
  driver:'كل توصيل مكتمل بيزود نقاطك. تقدر تستبدلها بجوايز مخصصة للمندوب، زي عملية بدون عمولة منصة لما تكون الجائزة متاحة.',
  merchant:'كل طلب مكتمل من متجرك بيزود نقاطك. تقدر تستبدلها بجوايز مخصصة للتاجر، زي طلب بدون عمولة منصة لما تكون الجائزة متاحة.',
};

export default function Rewards(){
  const params=useLocalSearchParams<{role?:string}>();
  const requested=params.role;
  const role:RewardRole=requested==='driver'||requested==='merchant'?'driver'===requested?'driver':'merchant':'customer';
  const client=useQueryClient();
  const roles=useQuery({queryKey:['roles'],queryFn:getMyRoles});
  const allowed=(roles.data??[]).includes(role);
  const summary=useQuery({queryKey:['rewards'],queryFn:getMyRewards,enabled:allowed});
  const events=useQuery({queryKey:['reward-events',role],queryFn:()=>getMyRewardEvents(role),enabled:allowed});
  const catalog=useQuery({queryKey:['reward-catalog',role],queryFn:()=>getRewardCatalog(role),enabled:allowed});
  const redemptions=useQuery({queryKey:['reward-redemptions'],queryFn:getMyRewardRedemptions,enabled:allowed});
  const[busy,setBusy]=useState<string|null>(null);
  const level=rewardLevel(summary.data?.lifetime_points??0);
  const next=level.next;const progress=next?Math.min(1,(summary.data?.lifetime_points??0)/next):1;

  async function redeem(id:string,title:string){setBusy(id);try{await redeemReward(id);await Promise.all([client.invalidateQueries({queryKey:['rewards']}),client.invalidateQueries({queryKey:['reward-events',role]}),client.invalidateQueries({queryKey:['reward-redemptions']})]);Alert.alert('المكافأة جاهزة',`${title} اتضافت لحسابك وهتتطبق تلقائي على أول عملية مؤهلة.`);}catch(e){Alert.alert('تعذر استبدال المكافأة',e instanceof Error?e.message:'حاول مرة أخرى.');}finally{setBusy(null);}}

  if(roles.isLoading)return <View style={s.center}><Muted>جاري تحميل مكافآتك…</Muted></View>;
  if(!allowed)return <View style={s.center}><Title>المكافآت غير متاحة هنا</Title><Muted>افتح المكافآت من واجهة نوع الحساب المفعّل عندك.</Muted><Button title="الرجوع للحساب" onPress={()=>router.replace('/account')}/></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Title>{roleTitle[role]}</Title>
    <View style={s.hero}><Text style={s.points}>{summary.isLoading?'…':summary.data?.points??0}</Text><Text style={s.pointsLabel}>نقطة متاحة</Text><View style={s.levelRow}><Text style={s.level}>مستوى {level.name}</Text><Text style={s.life}>إجمالي {summary.data?.lifetime_points??0} نقطة</Text></View><View style={s.bar}><View style={[s.barFill,{width:`${Math.round(progress*100)}%`]}/></View>{next?<Text style={s.next}>فاضلك {Math.max(0,next-(summary.data?.lifetime_points??0))} نقطة للمستوى اللي بعده</Text>:<Text style={s.next}>وصلت لأعلى مستوى حاليًا 🎉</Text>}</View>

    <Card><Text style={s.heading}>النقاط بتفيدك إزاي؟</Text><Muted>{roleExplain[role]}</Muted></Card>

    <Text style={s.section}>الجوايز المتاحة ليك</Text>
    {(catalog.data??[]).length===0?<Card><Muted>مفيش جوايز مفعلة للحساب ده حاليًا.</Muted></Card>:(catalog.data??[]).map(item=>{const enough=(summary.data?.points??0)>=item.points_cost;return <Card key={item.id}><View style={s.rewardRow}><View style={s.flex}><Text style={s.rewardTitle}>{item.title}</Text><Muted>{item.description||rewardTypeLabel[item.reward_type]||'مكافأة طلباتك'}</Muted></View><View style={s.cost}><Text style={s.costValue}>{item.points_cost}</Text><Text style={s.costLabel}>نقطة</Text></View></View><Button title={busy===item.id?'جاري الاستبدال…':enough?'استبدال النقاط':'النقاط غير كافية'} disabled={busy!==null||!enough} onPress={()=>Alert.alert('تأكيد الاستبدال',`هتستخدم ${item.points_cost} نقطة مقابل «${item.title}».`,[{text:'رجوع',style:'cancel'},{text:'تأكيد',onPress:()=>void redeem(item.id,item.title)}])}/></Card>})}

    {(redemptions.data??[]).some(x=>x.status==='available')?<><Text style={s.section}>مكافآت جاهزة للاستخدام</Text>{(redemptions.data??[]).filter(x=>x.status==='available').map(x=><Card key={x.id}><View style={s.eventRow}><View style={s.flex}><Text style={s.eventTitle}>مكافأة جاهزة</Text><Muted>اتخصم {x.points_spent} نقطة • صالحة لحد {x.expires_at?new Date(x.expires_at).toLocaleDateString('ar-EG'):'بدون تاريخ انتهاء'}</Muted></View><Text style={s.ready}>جاهزة</Text></View></Card>)}</>:null}

    <Card><Text style={s.heading}>ادعُ شخص جديد وخدوا مكافأة</Text><Muted>شارك كودك مع شخص جديد. لازم يكتبه أثناء إنشاء حسابه لأول مرة. بعد أول نشاط مكتمل ليه، كل واحد فيكم بياخد 50 نقطة.</Muted><View style={s.codeBox}><Text style={s.codeLabel}>كود دعوتك</Text><Text selectable style={s.code}>{summary.data?.referral_code||'…'}</Text></View><Text style={s.invited}>دعوات مكتملة: {summary.data?.referrals_count??0}</Text></Card>

    <Text style={s.section}>سجل نقاط {role==='customer'?'العميل':role==='driver'?'المندوب':'التاجر'}</Text>
    {(events.data??[]).length===0?<Card><Muted>لسه مفيش حركات نقاط للحساب ده.</Muted></Card>:(events.data??[]).map(item=><Card key={item.id}><View style={s.eventRow}><View style={s.flex}><Text style={s.eventTitle}>{eventLabel[item.source]??item.note??'مكافأة'}</Text><Text style={s.eventDate}>{new Date(item.created_at).toLocaleString('ar-EG')}</Text></View><Text style={[s.delta,item.points_delta<0&&s.deltaMinus]}>{item.points_delta>0?'+':''}{item.points_delta}</Text></View></Card>)}
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:13,direction:'rtl'},center:{flex:1,justifyContent:'center',padding:24,gap:10,backgroundColor:'#f5f7fa'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22,gap:8},points:{fontSize:46,fontWeight:'900',color:'#fff',textAlign:'right'},pointsLabel:{color:'#fdba74',fontWeight:'900',textAlign:'right'},levelRow:{flexDirection:'row-reverse',justifyContent:'space-between',gap:10,marginTop:6},level:{color:'#fff',fontWeight:'900'},life:{color:'#cbd5e1',fontSize:12},bar:{height:9,backgroundColor:'#344054',borderRadius:99,overflow:'hidden'},barFill:{height:'100%',backgroundColor:'#fb923c'},next:{color:'#d0d5dd',fontSize:11,textAlign:'right'},heading:{fontSize:17,fontWeight:'900',color:'#101828',textAlign:'right'},section:{fontSize:20,fontWeight:'900',color:'#101828',textAlign:'right'},rewardRow:{flexDirection:'row-reverse',gap:10,alignItems:'center'},flex:{flex:1},rewardTitle:{fontSize:17,fontWeight:'900',color:'#101828',textAlign:'right'},cost:{backgroundColor:'#fff4ed',borderRadius:14,padding:9,alignItems:'center',minWidth:64},costValue:{fontSize:19,fontWeight:'900',color:'#b93815'},costLabel:{fontSize:9,color:'#c2410c'},ready:{color:'#067647',fontWeight:'900',backgroundColor:'#ecfdf3',paddingHorizontal:10,paddingVertical:6,borderRadius:999},codeBox:{backgroundColor:'#fff4ed',borderWidth:1,borderColor:'#fed7aa',borderRadius:16,padding:14,gap:4},codeLabel:{fontSize:11,color:'#9a3412',textAlign:'right'},code:{fontSize:27,fontWeight:'900',letterSpacing:3,color:'#9a3412',textAlign:'center'},invited:{fontSize:12,fontWeight:'800',color:'#475467',textAlign:'right'},eventRow:{flexDirection:'row-reverse',alignItems:'center',gap:10},eventTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},eventDate:{fontSize:11,color:'#98a2b3',textAlign:'right',marginTop:3},delta:{fontSize:20,fontWeight:'900',color:colors.success},deltaMinus:{color:colors.danger}});