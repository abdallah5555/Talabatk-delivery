import { useQuery } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Button, Card, Muted, colors } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
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
  const list=(roles.data??[]) as AppRole[];
  const metadataName=typeof session?.user.user_metadata?.full_name==='string'?session.user.user_metadata.full_name.trim():'';
  const metadataPhone=typeof session?.user.user_metadata?.phone==='string'?session.user.user_metadata.phone.trim():'';
  const phone=profile.data?.phone||metadataPhone||'';
  const name=profile.data?.full_name||metadataName||phone||'حساب طلباتك';
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}><View style={s.profileRow}>{profile.data?.avatar_url?<Image source={{uri:profile.data.avatar_url}} style={s.avatar} contentFit="cover"/>:<View style={s.avatarPlaceholder}><Text style={s.avatarLetter}>{name[0]}</Text></View>}<View style={s.flex}><Text style={s.name}>{name}</Text><Text style={s.phone}>{phone}</Text><Text style={s.heroHint}>أنت فاتح الحساب ده حاليًا. اختار الخدمة أو وضع الحساب اللي محتاجه.</Text></View></View></View>

    {list.length>1?<><Text style={s.section}>تبديل وضع الحساب</Text><View style={s.roleGrid}>{list.map(role=><Pressable key={role} accessibilityRole="button" onPress={()=>router.replace(roleRoute[role] as never)} style={s.roleCard}><Text style={s.roleIcon}>{roleIcon[role]}</Text><Text style={s.roleName}>{names[role]}</Text><Text style={s.roleOpen}>فتح الواجهة</Text></Pressable>)}</View></>:null}

    <Text style={s.section}>اختصاراتك</Text><View style={s.grid}><Tile icon="🧾" title="طلباتي" subtitle="متابعة وسجل الطلبات" onPress={()=>router.push('/orders')}/><Tile icon="📍" title="عناويني" subtitle="بيت، شغل وأماكن محفوظة" onPress={()=>router.push('/addresses')}/><Tile icon="❤️" title="المفضلة" subtitle="أماكنك المحفوظة" onPress={()=>router.push('/favorites')}/><Tile icon="🔔" title="الإشعارات" subtitle="آخر التحديثات" onPress={()=>router.push('/notifications')}/><Tile icon="🤲" title="الأذكار" subtitle="تذكير من 1 إلى 15 دقيقة" onPress={()=>router.push('/adhkar')}/></View>

    <Text style={s.section}>الحساب والأمان</Text><Card><Menu title="ملفي الشخصي" subtitle="الصورة والاسم وتفضيلات التوصيل" icon="🙂" onPress={()=>router.push('/profile')}/><Divider/><Menu title="بياناتي والخصوصية" subtitle="معلومات الحساب والخصوصية" icon="👤" onPress={()=>router.push('/privacy')}/><Divider/><Menu title="الأمان وكلمة المرور" subtitle="تغيير كلمة المرور وإعدادات الحماية" icon="🔐" onPress={()=>router.push('/security')}/><Divider/><Menu title="الدعم والشكاوى" subtitle="مساعدة ومتابعة المشاكل" icon="💬" onPress={()=>router.push('/support')}/></Card>

    <Text style={s.section}>استخدم طلباتك في شغلك</Text><Card><View style={s.workRow}><View style={s.workIcon}><Text style={{fontSize:24}}>🚀</Text></View><View style={s.flex}><Text style={s.cardTitle}>تاجر أو مندوب؟</Text><Muted>كمّل البيانات والمستندات، والإدارة تراجع الطلب قبل تفعيل الدور.</Muted></View></View><Button title="الانضمام كتاجر أو مندوب" onPress={()=>router.push('/applications')}/></Card>

    <Pressable accessibilityRole="button" style={s.logout} onPress={async()=>{const{error}=await supabase.auth.signOut();if(error)return Alert.alert('تعذر الخروج',error.message);router.replace('/login');}}><Text style={s.logoutText}>تسجيل الخروج</Text></Pressable>
  </ScrollView>;
}
function Tile({icon,title,subtitle,onPress}:{icon:string;title:string;subtitle:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={s.tile}><View style={s.tileIconWrap}><Text style={s.tileIcon}>{icon}</Text></View><Text style={s.tileTitle}>{title}</Text><Text style={s.tileSub}>{subtitle}</Text></Pressable>}
function Menu({icon,title,subtitle,onPress}:{icon:string;title:string;subtitle:string;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={s.menu}><View style={s.menuIconWrap}><Text style={s.menuIcon}>{icon}</Text></View><View style={s.flex}><Text style={s.menuTitle}>{title}</Text><Text style={s.menuSub}>{subtitle}</Text></View><Text style={s.chevron}>‹</Text></Pressable>}
function Divider(){return <View style={s.divider}/>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:14,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22},profileRow:{flexDirection:'row-reverse',alignItems:'center',gap:14},avatar:{width:82,height:82,borderRadius:26,backgroundColor:'#344054'},avatarPlaceholder:{width:82,height:82,borderRadius:26,backgroundColor:'#253246',alignItems:'center',justifyContent:'center'},avatarLetter:{fontSize:32,fontWeight:'900',color:'#fff'},flex:{flex:1},name:{fontSize:24,lineHeight:32,fontWeight:'900',color:'#fff',textAlign:'right'},phone:{color:'#d0d5dd',fontSize:13,textAlign:'right',marginTop:3},heroHint:{color:'#cbd5e1',fontSize:12,lineHeight:19,textAlign:'right',marginTop:7},section:{fontSize:20,lineHeight:30,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:4},roleGrid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},roleCard:{width:'48%',backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:'#eaecf0',padding:15,gap:5},roleIcon:{fontSize:25},roleName:{fontSize:16,fontWeight:'900',color:'#101828',textAlign:'right'},roleOpen:{fontSize:11,fontWeight:'800',color:colors.primary,textAlign:'right'},grid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},tile:{width:'48%',minHeight:126,backgroundColor:'#fff',borderRadius:20,borderWidth:1,borderColor:'#eaecf0',padding:14,gap:6},tileIconWrap:{width:42,height:42,borderRadius:13,backgroundColor:'#fff4ed',alignItems:'center',justifyContent:'center'},tileIcon:{fontSize:22},tileTitle:{fontWeight:'900',fontSize:15,color:'#1d2939',textAlign:'right'},tileSub:{fontSize:11,lineHeight:18,color:'#667085',textAlign:'right'},menu:{minHeight:68,flexDirection:'row-reverse',alignItems:'center',gap:11},menuIconWrap:{width:42,height:42,borderRadius:13,backgroundColor:'#f2f4f7',alignItems:'center',justifyContent:'center'},menuIcon:{fontSize:20},menuTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},menuSub:{fontSize:11,lineHeight:18,color:'#98a2b3',textAlign:'right',marginTop:2},chevron:{fontSize:28,color:'#98a2b3'},divider:{height:1,backgroundColor:'#f2f4f7'},workRow:{flexDirection:'row-reverse',alignItems:'center',gap:11},workIcon:{width:48,height:48,borderRadius:15,backgroundColor:'#fff4ed',alignItems:'center',justifyContent:'center'},cardTitle:{fontSize:17,lineHeight:25,fontWeight:'900',color:colors.text,textAlign:'right'},logout:{minHeight:50,borderRadius:15,borderWidth:1,borderColor:'#fda29b',backgroundColor:'#fff',alignItems:'center',justifyContent:'center'},logoutText:{color:'#b42318',fontWeight:'900'}});
