import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { claimReferralCode, getMyRewardEvents, getMyRewardRedemptions, getMyRewards, getRewardCatalog, redeemReward, rewardLevel } from '@/src/lib/rewards';

const eventLabel:Record<string,string>={order_delivered:'طلب عميل مكتمل',driver_delivery:'توصيل مكتمل',merchant_order:'طلب متجر مكتمل',referral_referrer:'دعوة صديق',referral_referred:'مكافأة أول طلب',admin_adjustment:'تعديل من الإدارة',reward_redemption:'استبدال مكافأة'};
const rewardTypeLabel:Record<string,string>={free_delivery:'توصيل مجاني للطلب القادم',commission_free_next_order:'طلب بدون عمولة منصة',priority_badge:'ميزة أولوية',custom:'مكافأة خاصة'};

export default function Rewards(){
  const client=useQueryClient();
  const summary=useQuery({queryKey:['rewards'],queryFn:getMyRewards});
  const events=useQuery({queryKey:['reward-events'],queryFn:getMyRewardEvents});
  const catalog=useQuery({queryKey:['reward-catalog'],queryFn:getRewardCatalog});
  const redemptions=useQuery({queryKey:['reward-redemptions'],queryFn:getMyRewardRedemptions});
  const[code,setCode]=useState('');const[busy,setBusy]=useState<string|null>(null);
  const level=rewardLevel(summary.data?.lifetime_points??0);
  const next=level.next;const progress=next?Math.min(1,(summary.data?.lifetime_points??0)/next):1;

  async function claim(){setBusy('claim');try{await claimReferralCode(code);setCode('');await Promise.all([client.invalidateQueries({queryKey:['rewards']}),client.invalidateQueries({queryKey:['reward-events']})]);Alert.alert('تم تسجيل الكود','مكافأة الدعوة بتضاف بعد أول طلب مكتمل حسب إعدادات المنصة.');}catch(e){Alert.alert('تعذر تسجيل الكود',e instanceof Error?e.message:'حاول مرة أخرى.');}finally{setBusy(null);}}
  async function redeem(id:string,title:string){setBusy(id);try{await redeemReward(id);await Promise.all([client.invalidateQueries({queryKey:['rewards']}),client.invalidateQueries({queryKey:['reward-events']}),client.invalidateQueries({queryKey:['reward-redemptions']})]);Alert.alert('المكافأة جاهزة',`${title} اتضافت لحسابك وهتتطبق تلقائي على أول عملية مؤهلة.`);}catch(e){Alert.alert('تعذر استبدال المكافأة',e instanceof Error?e.message:'حاول مرة أخرى.');}finally{setBusy(null);}}

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Title>نقاط ومكافآت طلباتك</Title>
    <View style={s.hero}><Text style={s.points}>{summary.isLoading?'…':summary.data?.points??0}</Text><Text style={s.pointsLabel}>نقطة متاحة</Text><View style={s.levelRow}><Text style={s.level}>مستوى {level.name}</Text><Text style={s.life}>إجمالي {summary.data?.lifetime_points??0} نقطة</Text></View><View style={s.bar}><View style={[s.barFill,{width:`${Math.round(progress*100)}%`}]}/></View>{next?<Text style={s.next}>فاضلك {Math.max(0,next-(summary.data?.lifetime_points??0))} نقطة للمستوى اللي بعده</Text>:<Text style={s.next}>وصلت لأعلى مستوى حاليًا 🎉</Text>}</View>

    <Card><Text style={s.heading}>النقاط لكل أنواع الحسابات</Text><Muted>العميل يكسب من الطلبات، المندوب من التوصيلات المكتملة، والتاجر من الطلبات المسلّمة. عدد النقاط والجوايز بيتحدد من الإدارة ومش بيتحول لكاش.</Muted></Card>

    <Text style={s.section}>الجوايز المتاحة ليك</Text>
    {(catalog.data??[]).length===0?<Card><Muted>مفيش جوايز مفعلة لنوع حسابك حاليًا.</Muted></Card>:(catalog.data??[]).map(item=>{const enough=(summary.data?.points??0)>=item.points_cost;return <Card key={item.id}><View style={s.rewardRow}><View style={s.flex}><Text style={s.rewardTitle}>{item.title}</Text><Muted>{item.description||rewardTypeLabel[item.reward_type]||'مكافأة طلباتك'}</Muted></View><View style={s.cost}><Text style={s.costValue}>{item.points_cost}</Text><Text style={s.costLabel}>نقطة</Text></View></View><Button title={busy===item.id?'جاري الاستبدال…':enough?'استبدال النقاط':'النقاط غير كافية'} disabled={busy!==null||!enough} onPress={()=>Alert.alert('تأكيد الاستبدال',`هتستخدم ${item.points_cost} نقطة مقابل «${item.title}».`,[{text:'رجوع',style:'cancel'},{text:'تأكيد',onPress:()=>void redeem(item.id,item.title)}])}/></Card>})}

    {(redemptions.data??[]).some(x=>x.status==='available')?<><Text style={s.section}>مكافآت جاهزة للاستخدام</Text>{(redemptions.data??[]).filter(x=>x.status==='available').map(x=><Card key={x.id}><View style={s.eventRow}><View style={s.flex}><Text style={s.eventTitle}>مكافأة جاهزة</Text><Muted>اتخصم {x.points_spent} نقطة • صالحة لحد {x.expires_at?new Date(x.expires_at).toLocaleDateString('ar-EG'):'بدون تاريخ انتهاء'}</Muted></View><Text style={s.ready}>جاهزة</Text></View></Card>)}</>:null}

    <Card><Text style={s.heading}>ادعُ أصحابك</Text><Muted>شارك كودك. قيمة مكافأة الدعوة بيحددها الأدمن وبتتحسب بعد أول طلب مكتمل.</Muted><View style={s.codeBox}><Text style={s.codeLabel}>كود دعوتك</Text><Text selectable style={s.code}>{summary.data?.referral_code||'…'}</Text></View><Text style={s.invited}>دعوات مكتملة: {summary.data?.referrals_count??0}</Text></Card>
    <Card><Text style={s.heading}>عندك كود دعوة؟</Text><Field value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="اكتب كود الدعوة" accessibilityLabel="كود الدعوة"/><Button title={busy==='claim'?'جاري التسجيل…':'تسجيل كود الدعوة'} onPress={()=>void claim()} disabled={busy!==null||code.trim().length<4}/></Card>

    <Text style={s.section}>سجل النقاط</Text>
    {(events.data??[]).length===0?<Card><Muted>لسه مفيش حركات نقاط.</Muted></Card>:(events.data??[]).map(item=><Card key={item.id}><View style={s.eventRow}><View style={s.flex}><Text style={s.eventTitle}>{eventLabel[item.source]??item.note??'مكافأة'}</Text><Text style={s.eventDate}>{new Date(item.created_at).toLocaleString('ar-EG')}</Text></View><Text style={[s.delta,item.points_delta<0&&s.deltaMinus]}>{item.points_delta>0?'+':''}{item.points_delta}</Text></View></Card>)}
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:13,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22,gap:8},points:{fontSize:46,fontWeight:'900',color:'#fff',textAlign:'right'},pointsLabel:{color:'#fdba74',fontWeight:'900',textAlign:'right'},levelRow:{flexDirection:'row-reverse',justifyContent:'space-between',gap:10,marginTop:6},level:{color:'#fff',fontWeight:'900'},life:{color:'#cbd5e1',fontSize:12},bar:{height:9,backgroundColor:'#344054',borderRadius:99,overflow:'hidden'},barFill:{height:'100%',backgroundColor:'#fb923c'},next:{color:'#d0d5dd',fontSize:11,textAlign:'right'},heading:{fontSize:17,fontWeight:'900',color:'#101828',textAlign:'right'},section:{fontSize:20,fontWeight:'900',color:'#101828',textAlign:'right'},rewardRow:{flexDirection:'row-reverse',gap:10,alignItems:'center'},flex:{flex:1},rewardTitle:{fontSize:17,fontWeight:'900',color:'#101828',textAlign:'right'},cost:{backgroundColor:'#fff4ed',borderRadius:14,padding:9,alignItems:'center',minWidth:64},costValue:{fontSize:19,fontWeight:'900',color:'#b93815'},costLabel:{fontSize:9,color:'#c2410c'},ready:{color:'#067647',fontWeight:'900',backgroundColor:'#ecfdf3',paddingHorizontal:10,paddingVertical:6,borderRadius:999},codeBox:{backgroundColor:'#fff4ed',borderWidth:1,borderColor:'#fed7aa',borderRadius:16,padding:14,gap:4},codeLabel:{fontSize:11,color:'#9a3412',textAlign:'right'},code:{fontSize:27,fontWeight:'900',letterSpacing:3,color:'#9a3412',textAlign:'center'},invited:{fontSize:12,fontWeight:'800',color:'#475467',textAlign:'right'},eventRow:{flexDirection:'row-reverse',alignItems:'center',gap:10},eventTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},eventDate:{fontSize:11,color:'#98a2b3',textAlign:'right',marginTop:3},delta:{fontSize:20,fontWeight:'900',color:colors.success},deltaMinus:{color:colors.danger}});