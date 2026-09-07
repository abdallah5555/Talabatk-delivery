import { useEffect } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Title, colors } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { acceptDriverOrder, advanceDriverOrder, getAvailableDriverOrders, getDriverState, getMerchantOrders, getMerchantStores, getMyDriverOrders, merchantUpdateOrder, setDriverAvailability } from '@/src/lib/features';
import { setStoreOpen } from '@/src/lib/merchantOps';
import { startDriverLocationUpdates } from '@/src/lib/driverLocation';
import type { Role } from '@/src/types/domain';

export default function RoleScreen(){
  const {role}=useLocalSearchParams<{role:Role}>();
  const roles=useQuery({queryKey:['roles'],queryFn:getMyRoles});
  if(roles.isLoading)return <View style={s.center}><Muted>جاري التحقق من الصلاحيات…</Muted></View>;
  if(!role||!(roles.data??[]).includes(role))return <View style={s.center}><Title>غير مصرح</Title><Muted>الدور المطلوب غير مفعّل لحسابك.</Muted></View>;
  if(role==='admin')return <Redirect href="/admin"/>;
  if(role==='customer')return <Redirect href="/home"/>;
  if(role==='merchant')return <MerchantDashboard/>;
  return <DriverDashboard/>;
}

function MerchantDashboard(){
  const client=useQueryClient();
  const stores=useQuery({queryKey:['merchant-stores'],queryFn:getMerchantStores});
  const ids=(stores.data??[]).map((x:any)=>x.id);
  const orders=useQuery({queryKey:['merchant-orders',ids.join(',')],queryFn:()=>getMerchantOrders(ids),enabled:ids.length>0,refetchInterval:12000});
  const pending=(orders.data??[]).filter(x=>x.status==='pending').length;
  const preparing=(orders.data??[]).filter(x=>['accepted','preparing'].includes(x.status)).length;
  async function move(id:string,status:'accepted'|'rejected'|'preparing'|'ready'){try{await merchantUpdateOrder(id,status);await client.invalidateQueries({queryKey:['merchant-orders']});}catch(e){Alert.alert('تعذر تحديث الطلب',e instanceof Error?e.message:'حاول مرة أخرى');}}
  async function toggleStore(id:string,isOpen:boolean){try{await setStoreOpen(id,!isOpen);await client.invalidateQueries({queryKey:['merchant-stores']});await client.invalidateQueries({queryKey:['stores']});}catch(e){Alert.alert('تعذر تغيير حالة المتجر',e instanceof Error?e.message:'حاول مرة أخرى');}}
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.merchantHero}><Text style={s.kicker}>MERCHANT</Text><Text style={s.heroTitle}>إدارة نشاطك من مكان واحد</Text><Text style={s.heroSub}>طلبات لحظية، منيو ومخزون، كاشير وتقارير — من غير قوائم العميل.</Text><View style={s.statRow}><HeroStat value={String(pending)} label="جديد"/><HeroStat value={String(preparing)} label="قيد التحضير"/><HeroStat value={String(stores.data?.length??0)} label="متجر"/></View></View>
    <Text style={s.section}>متاجرك</Text>
    {!stores.isLoading&&!stores.data?.length?<Card><Text style={s.cardTitle}>لسه مفيش متجر معتمد</Text><Muted>لو سجلت كتاجر، طلبك لازم يتراجع من الإدارة قبل إنشاء المتجر.</Muted><Button title="استكمال / متابعة طلب التاجر" onPress={()=>router.push({pathname:'/onboarding',params:{role:'merchant'}})}/></Card>:null}
    {(stores.data??[]).map((store:any)=><Card key={store.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>{store.name}</Text><Muted>{store.category} • {store.is_open?'ظاهر للعملاء ويستقبل طلبات':'مغلق وغير ظاهر في قائمة المتاجر'}</Muted></View><Text style={[s.status,{color:store.is_open?'#067647':'#b42318'}]}>{store.is_open?'● مفتوح':'● مغلق'}</Text></View><View style={s.two}><Action title="المنيو والمخزون" icon="🍽️" onPress={()=>router.push(`/merchant/${store.id}`)}/><Action title="الكاشير والتقارير" icon="🧾" onPress={()=>router.push({pathname:'/merchant/report/[storeId]',params:{storeId:store.id}})}/></View><Button title={store.is_open?'إغلاق المتجر مؤقتًا':'فتح المتجر للعملاء'} onPress={()=>void toggleStore(store.id,store.is_open)}/>{!store.is_open?<Muted>جهّز المنيو والأسعار قبل فتح المتجر. المتجر المعتمد يبدأ مغلقًا افتراضيًا.</Muted>:null}</Card>)}
    <Text style={s.section}>الطلبات الجارية</Text>
    {(orders.data??[]).map(item=><Card key={item.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>طلب #{item.id.slice(0,8)}</Text><Muted>{statusAr(item.status)} • {item.total.toFixed(2)} ج</Muted></View><Text style={s.orderPrice}>{item.total.toFixed(0)} ج</Text></View>{item.status==='pending'?<View style={s.two}><View style={s.flex}><Button title="قبول" onPress={()=>move(item.id,'accepted')}/></View><View style={s.flex}><Button title="رفض" onPress={()=>move(item.id,'rejected')}/></View></View>:null}{item.status==='accepted'?<Button title="بدء التحضير" onPress={()=>move(item.id,'preparing')}/>:null}{item.status==='preparing'?<Button title="الطلب جاهز للاستلام" onPress={()=>move(item.id,'ready')}/>:null}</Card>)}
    {!orders.isLoading&&!orders.data?.length?<View style={s.empty}><Text style={s.emptyIcon}>📭</Text><Text style={s.emptyTitle}>مفيش طلبات تشغيل حالية</Text></View>:null}
  </ScrollView>;
}

function DriverDashboard(){
  const client=useQueryClient();
  const state=useQuery({queryKey:['driver-state'],queryFn:getDriverState});
  const available=useQuery({queryKey:['driver-available'],queryFn:getAvailableDriverOrders,enabled:!!state.data?.is_online,refetchInterval:10000});
  const active=useQuery({queryKey:['driver-active'],queryFn:getMyDriverOrders,refetchInterval:10000});
  useEffect(()=>{let stop:(()=>void)|undefined;let cancelled=false;if(!state.data?.is_online)return;void startDriverLocationUpdates().then(cleanup=>{if(cancelled)cleanup();else stop=cleanup;}).catch(e=>Alert.alert('الموقع غير متاح',e instanceof Error?e.message:'تعذر تشغيل GPS'));return()=>{cancelled=true;stop?.();};},[state.data?.is_online]);
  async function toggle(){try{await setDriverAvailability(!state.data?.is_online);await client.invalidateQueries({queryKey:['driver-state']});await client.invalidateQueries({queryKey:['driver-available']});}catch(e){Alert.alert('تعذر تغيير الحالة',e instanceof Error?e.message:'حاول مرة أخرى');}}
  async function accept(id:string){try{await acceptDriverOrder(id);await client.invalidateQueries({queryKey:['driver-available']});await client.invalidateQueries({queryKey:['driver-active']});}catch(e){Alert.alert('الطلب لم يعد متاحًا',e instanceof Error?e.message:'اختار طلب آخر');}}
  async function advance(id:string,status:'picked_up'|'on_the_way'|'delivered'){try{await advanceDriverOrder(id,status);await client.invalidateQueries({queryKey:['driver-active']});}catch(e){Alert.alert('تعذر تحديث الطلب',e instanceof Error?e.message:'حاول مرة أخرى');}}
  const online=Boolean(state.data?.is_online);
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={[s.driverHero,online&&s.driverHeroOnline]}><Text style={s.kicker}>DRIVER</Text><View style={s.row}><View style={s.flex}><Text style={s.heroTitle}>{online?'أنت متاح لاستقبال الطلبات':'أنت خارج الوردية'}</Text><Text style={s.heroSub}>{online?'GPS يعمل أثناء فتح التطبيق والطلبات الجديدة هتظهر تلقائيًا.':'ابدأ الوردية لما تكون جاهز للتحرك.'}</Text></View><View style={[s.onlineDot,!online&&s.offlineDot]}/></View><Button title={online?'إنهاء الوردية':'ابدأ الوردية'} onPress={toggle}/></View>
    <View style={s.two}><Action title="الأرباح" icon="💰" onPress={()=>router.push('/driver/center')}/><Action title="التقييمات والبلاغات" icon="⭐" onPress={()=>router.push('/driver/center')}/></View>
    <Text style={s.section}>توصيلاتي الحالية</Text>
    {(active.data??[]).map(item=><Card key={item.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>طلب #{item.id.slice(0,8)}</Text><Muted>{statusAr(item.status)}</Muted></View><Text style={s.orderPrice}>{item.delivery_fee.toFixed(0)} ج</Text></View>{item.status==='assigned'?<Button title="استلمت الطلب من التاجر" onPress={()=>advance(item.id,'picked_up')}/>:null}{item.status==='picked_up'?<Button title="أنا في الطريق للعميل" onPress={()=>advance(item.id,'on_the_way')}/>:null}{item.status==='on_the_way'?<Button title="تم التسليم" onPress={()=>advance(item.id,'delivered')}/>:null}</Card>)}
    {!active.isLoading&&!active.data?.length?<Muted>لا توجد توصيلات نشطة على حسابك.</Muted>:null}
    <Text style={s.section}>طلبات متاحة</Text>
    {!online?<Card><Muted>فعّل الوردية لعرض الطلبات الجاهزة للاستلام.</Muted></Card>:null}
    {online&&(available.data??[]).map(item=><Card key={item.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>توصيلة متاحة</Text><Muted>طلب جاهز للاستلام • العنوان يظهر وفق مرحلة الطلب والصلاحيات.</Muted></View><Text style={s.orderPrice}>{item.delivery_fee.toFixed(0)} ج</Text></View><Button title="قبول التوصيلة" onPress={()=>accept(item.id)}/></Card>)}
    {online&&!available.isLoading&&!available.data?.length?<Muted>مفيش طلبات متاحة حاليًا.</Muted>:null}
  </ScrollView>;
}

function HeroStat({value,label}:{value:string;label:string}){return <View style={s.heroStat}><Text style={s.heroStatValue}>{value}</Text><Text style={s.heroStatLabel}>{label}</Text></View>}
function Action({title,icon,onPress}:{title:string;icon:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={s.action}><Text style={s.actionIcon}>{icon}</Text><Text style={s.actionTitle}>{title}</Text></Pressable>}
function statusAr(value:string){const map:Record<string,string>={pending:'جديد',accepted:'مقبول',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم تعيين مندوب',picked_up:'تم الاستلام',on_the_way:'في الطريق',delivered:'تم التسليم',rejected:'مرفوض',cancelled:'ملغي'};return map[value]??value;}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:13,direction:'rtl'},center:{flex:1,justifyContent:'center',backgroundColor:'#f5f7fa',padding:22,gap:10},merchantHero:{backgroundColor:'#17212f',borderRadius:30,padding:22,gap:9},driverHero:{backgroundColor:'#344054',borderRadius:30,padding:22,gap:13},driverHeroOnline:{backgroundColor:'#173b2b'},kicker:{color:'#fb923c',fontSize:12,fontWeight:'900',textAlign:'right',letterSpacing:1},heroTitle:{color:'#fff',fontSize:26,fontWeight:'900',lineHeight:34,textAlign:'right'},heroSub:{color:'#d0d5dd',fontSize:13,lineHeight:21,textAlign:'right'},statRow:{flexDirection:'row-reverse',gap:8,marginTop:5},heroStat:{flex:1,backgroundColor:'#253246',borderRadius:15,padding:11},heroStatValue:{color:'#fff',fontSize:20,fontWeight:'900',textAlign:'right'},heroStatLabel:{color:'#98a2b3',fontSize:10,textAlign:'right'},section:{fontSize:20,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:5},cardTitle:{fontSize:17,fontWeight:'900',color:colors.text,textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'flex-start',gap:10},flex:{flex:1},status:{fontWeight:'900',fontSize:11},two:{flexDirection:'row-reverse',gap:8},action:{flex:1,backgroundColor:'#fff',borderWidth:1,borderColor:'#eaecf0',borderRadius:18,padding:14,gap:6,alignItems:'center'},actionIcon:{fontSize:24},actionTitle:{fontSize:12,fontWeight:'900',color:'#344054',textAlign:'center'},orderPrice:{fontSize:17,fontWeight:'900',color:colors.primary},onlineDot:{width:16,height:16,borderRadius:8,backgroundColor:'#12b76a',marginTop:6},offlineDot:{backgroundColor:'#98a2b3'},empty:{alignItems:'center',paddingVertical:30,gap:6},emptyIcon:{fontSize:34},emptyTitle:{fontWeight:'900',color:'#475467'}});
