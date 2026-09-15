import { useQuery } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Card, Muted, colors } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { getMyFleetSummary } from '@/src/lib/finance';
import { supabase } from '@/src/lib/supabase';
import { getOnboardingIdentity } from '@/src/lib/onboarding';
import { useAuth } from '@/src/providers/AppProviders';

type AppRole='customer'|'merchant'|'driver'|'admin';
const names:Record<AppRole,string>={customer:'عميل',merchant:'تاجر',driver:'مندوب',admin:'إدارة'};
const roleIcon:Record<AppRole,string>={customer:'🛍️',merchant:'🏪',driver:'🛵',admin:'⚙️'};
const roleRoute:Record<AppRole,string>={customer:'/home',merchant:'/role/merchant',driver:'/role/driver',admin:'/admin'};

export default function Account(){
  const {session}=useAuth();
  const roles=useQuery({queryKey:['roles',session?.user.id],queryFn:getMyRoles,enabled:Boolean(session?.user.id)});
  const profile=useQuery({queryKey:['profile-summary',session?.user.id],queryFn:getOnboardingIdentity,enabled:Boolean(session?.user.id),retry:2,staleTime:30_000});
  const fleet=useQuery({queryKey:['fleet-summary',session?.user.id],queryFn:getMyFleetSummary,enabled:Boolean(session?.user.id),retry:false,staleTime:30_000});
  const list=(roles.data??[]) as AppRole[];
  const hasCustomer=list.includes('customer');
  const hasMerchant=list.includes('merchant');
  const hasDriver=list.includes('driver');
  const hasBusinessRole=hasMerchant||hasDriver||Boolean(fleet.data?.fleet_id);
  const metadataName=typeof session?.user.user_metadata?.full_name==='string'?session.user.user_metadata.full_name.trim():'';
  const metadataPhone=typeof session?.user.user_metadata?.phone==='string'?session.user.user_metadata.phone.trim():'';
  const phone=profile.data?.phone||metadataPhone||'';
  const name=profile.data?.full_name||metadataName||phone||'حساب طلباتك';

  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/profile')} style={s.hero}>
      <View style={s.profileRow}>
        {profile.data?.avatar_url?<Image source={{uri:profile.data.avatar_url}} style={s.avatar} contentFit="cover"/>:<View style={s.avatarPlaceholder}><Text style={s.avatarLetter}>{name[0]}</Text></View>}
        <View style={s.flex}><Text style={s.name}>{name}</Text><Text style={s.phone}>{phone}</Text><Text style={s.heroHint}>اضغط لتعديل الصورة والاسم وبياناتك الشخصية</Text></View>
        <Text style={s.edit}>تعديل</Text>
      </View>
    </Pressable>

    {list.length>1?<><Text style={s.section}>تبديل وضع الحساب</Text><View style={s.roleGrid}>{list.map(role=><Pressable key={role} accessibilityRole="button" onPress={()=>router.replace(roleRoute[role] as never)} style={s.roleCard}><Text style={s.roleIcon}>{roleIcon[role]}</Text><Text style={s.roleName}>{names[role]}</Text><Text style={s.roleOpen}>فتح الواجهة</Text></Pressable>)}</View></>:null}

    {hasCustomer?<><Text style={s.section}>حساب العميل</Text><Card>
      <Menu title="طلباتي" subtitle="تابع الطلبات الحالية وشوف الطلبات السابقة" icon="🧾" onPress={()=>router.push('/orders')}/><Divider/>
      <Menu title="عناويني" subtitle="البيت والشغل وأماكن التوصيل المحفوظة" icon="📍" onPress={()=>router.push('/addresses')}/><Divider/>
      <Menu title="المفضلة" subtitle="المتاجر والأماكن اللي حفظتها" icon="❤️" onPress={()=>router.push('/favorites')}/><Divider/>
      <Menu title="النقاط والمكافآت" subtitle="رصيد نقاط العميل والجوايز المتاحة" icon="🎁" onPress={()=>router.push({pathname:'/rewards',params:{role:'customer'}})}/>
    </Card></>:null}

    <Text style={s.section}>الخدمات</Text><Card>
      <Menu title="مساعد طلباتك" subtitle="دور واسأل عن الطلبات والمتاجر بطريقتك" icon="✨" onPress={()=>router.push('/assistant')}/><Divider/>
      <Menu title="الإشعارات" subtitle="آخر التحديثات والتنبيهات" icon="🔔" onPress={()=>router.push('/notifications')}/><Divider/>
      <Menu title="الأذكار" subtitle="التذكيرات والأذكار داخل التطبيق" icon="🤲" onPress={()=>router.push('/adhkar')}/><Divider/>
      <Menu title="الدعم والشكاوى" subtitle="حل المشاكل ومتابعة الشكاوى" icon="💬" onPress={()=>router.push('/support')}/>
    </Card>

    <Text style={s.section}>بيانات الحساب والخصوصية</Text><Card>
      <Menu title="الملف الشخصي" subtitle="الصورة والاسم وبيانات التوصيل والتفضيلات" icon="🙂" onPress={()=>router.push('/profile')}/><Divider/>
      <Menu title="الخصوصية وبيانات الحساب" subtitle="معلومات الحساب وسياسة الخصوصية" icon="👤" onPress={()=>router.push('/privacy')}/><Divider/>
      <Menu title="الأمان وكلمة المرور" subtitle="تغيير كلمة المرور وإعدادات الحماية" icon="🔐" onPress={()=>router.push('/security')}/>
    </Card>

    {hasBusinessRole?<><Text style={s.section}>حساب الشغل</Text><Card>
      {hasMerchant?<Menu title="واجهة التاجر" subtitle="إدارة النشاط والطلبات" icon="🏪" onPress={()=>router.push('/role/merchant')}/>:null}
      {hasMerchant&&(hasDriver||Boolean(fleet.data?.fleet_id))?<Divider/>:null}
      {hasDriver?<Menu title="واجهة المندوب" subtitle="الطلبات والتوصيل وحالة العمل" icon="🛵" onPress={()=>router.push('/role/driver')}/>:null}
      {hasDriver&&fleet.data?.fleet_id?<Divider/>:null}
      {fleet.data?.fleet_id?<Menu title="شركتي" subtitle="المناديب وحسابات الشركة" icon="🏢" onPress={()=>router.push('/fleet')}/>:null}
      {(hasMerchant||hasDriver||fleet.data?.fleet_id)?<><Divider/><Menu title="المحفظة" subtitle="الرصيد والعمولات والتسويات" icon="💰" onPress={()=>router.push('/wallet')}/></>:null}
    </Card></>:<><Text style={s.section}>اشتغل مع طلباتك</Text><Card><View style={s.workRow}><View style={s.workIcon}><Text style={{fontSize:24}}>🚀</Text></View><View style={s.flex}><Text style={s.cardTitle}>تاجر أو مندوب؟</Text><Muted>التسجيل يتضمن البيانات والمستندات المطلوبة، وبعد إرسالها الإدارة تراجع الطلب قبل التفعيل.</Muted></View></View><Button title="ابدأ تسجيل تاجر أو مندوب" onPress={()=>router.push('/applications')}/></Card></>}

    <Pressable accessibilityRole="button" style={s.logout} onPress={async()=>{const{error}=await supabase.auth.signOut();if(error)return Alert.alert('تعذر الخروج',error.message);router.replace('/login');}}><Text style={s.logoutText}>تسجيل الخروج</Text></Pressable>
  </ScrollView>;
}

function Menu({icon,title,subtitle,onPress}:{icon:string;title:string;subtitle:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={s.menu}><View style={s.menuIconWrap}><Text style={s.menuIcon}>{icon}</Text></View><View style={s.flex}><Text style={s.menuTitle}>{title}</Text><Text style={s.menuSub}>{subtitle}</Text></View><Text style={s.chevron}>‹</Text></Pressable>}
function Divider(){return <View style={s.divider}/>}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:14,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22},profileRow:{flexDirection:'row-reverse',alignItems:'center',gap:14},avatar:{width:82,height:82,borderRadius:26,backgroundColor:'#344054'},avatarPlaceholder:{width:82,height:82,borderRadius:26,backgroundColor:'#253246',alignItems:'center',justifyContent:'center'},avatarLetter:{fontSize:32,fontWeight:'900',color:'#fff'},flex:{flex:1},name:{fontSize:24,lineHeight:32,fontWeight:'900',color:'#fff',textAlign:'right'},phone:{color:'#d0d5dd',fontSize:13,textAlign:'right',marginTop:3},heroHint:{color:'#cbd5e1',fontSize:12,lineHeight:19,textAlign:'right',marginTop:7},edit:{color:'#fb923c',fontWeight:'900',fontSize:13},section:{fontSize:20,lineHeight:30,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:4},roleGrid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},roleCard:{width:'48%',backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:'#eaecf0',padding:15,gap:5},roleIcon:{fontSize:25},roleName:{fontSize:16,fontWeight:'900',color:'#101828',textAlign:'right'},roleOpen:{fontSize:11,fontWeight:'800',color:colors.primary,textAlign:'right'},menu:{minHeight:72,flexDirection:'row-reverse',alignItems:'center',gap:11},menuIconWrap:{width:44,height:44,borderRadius:14,backgroundColor:'#f2f4f7',alignItems:'center',justifyContent:'center'},menuIcon:{fontSize:21},menuTitle:{fontWeight:'900',fontSize:15,color:'#344054',textAlign:'right'},menuSub:{fontSize:11,lineHeight:18,color:'#98a2b3',textAlign:'right',marginTop:2},chevron:{fontSize:28,color:'#98a2b3'},divider:{height:1,backgroundColor:'#f2f4f7'},workRow:{flexDirection:'row-reverse',alignItems:'center',gap:11},workIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#fff4ed',alignItems:'center',justifyContent:'center'},cardTitle:{fontSize:17,lineHeight:25,fontWeight:'900',color:colors.text,textAlign:'right'},logout:{minHeight:50,borderRadius:15,borderWidth:1,borderColor:'#fda29b',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},logoutText:{color:'#b42318',fontWeight:'900'}});
