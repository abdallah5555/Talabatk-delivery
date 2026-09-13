import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Muted, Title } from '@/src/components/ui';
import { getMyRoles } from '@/src/lib/api';
import { getAdminDashboardSnapshot } from '@/src/lib/adminDashboard';

export default function AdminDashboard(){
  const roles=useQuery({queryKey:['roles'],queryFn:getMyRoles,staleTime:60_000});
  const dashboard=useQuery({queryKey:['admin-dashboard'],queryFn:getAdminDashboardSnapshot,enabled:roles.data?.includes('admin'),staleTime:30_000,refetchInterval:60_000});

  if(roles.isLoading)return <View style={s.center}><Muted>جاري التحقق من صلاحية الإدارة…</Muted></View>;
  if(!roles.data?.includes('admin'))return <View style={s.center}><Title>غير مصرح</Title><Muted>الحساب الحالي لا يملك صلاحية الإدارة.</Muted></View>;
  if(dashboard.isLoading)return <View style={s.center}><Muted>جاري تجهيز لوحة القيادة…</Muted></View>;
  if(dashboard.isError)return <View style={s.center}><Title>تعذر تحميل لوحة الإدارة</Title><Muted>{dashboard.error instanceof Error?dashboard.error.message:'حاول مرة أخرى'}</Muted><Button title="إعادة المحاولة" onPress={()=>void dashboard.refetch()}/></View>;

  const data=dashboard.data!;
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.hero}>
      <View style={s.heroTop}><View style={s.liveDot}/><Text style={s.kicker}>ADMIN CONTROL CENTER</Text></View>
      <Text style={s.heroTitle}>لوحة قيادة طلباتك</Text>
      <Text style={s.heroText}>نظرة سريعة على المنصة، وبعدها ادخل للقسم المطلوب من غير ما كل أدوات الإدارة تبقى محشورة في شاشة واحدة.</Text>
    </View>

    <Text style={s.section}>نظرة عامة</Text>
    <View style={s.metrics}>
      <Metric label="المستخدمون" value={String(data.users)} note="حساب مسجل"/>
      <Metric label="المتاجر" value={String(data.stores)} note="نشاط على المنصة"/>
      <Metric label="طلبات نشطة" value={String(data.activeOrders)} note={`من ${data.totalOrders} طلب`}/>
      <Metric label="قيمة المسلّم" value={`${Math.round(data.deliveredRevenue)} ج`} note="طلبات تم تسليمها"/>
    </View>

    {(data.pendingApplications>0||data.openIssues>0||data.deletionRequests>0)?<>
      <Text style={s.section}>يحتاج انتباهك</Text>
      <View style={s.attentionRow}>
        <AttentionCard value={data.pendingApplications} title="طلبات اعتماد" onPress={()=>router.push('/admin/applications')}/>
        <AttentionCard value={data.openIssues+data.deletionRequests} title="متابعات تشغيل" onPress={()=>router.push('/admin/operations')}/>
      </View>
    </>:null}

    <Text style={s.section}>أقسام الإدارة</Text>
    <View style={s.grid}>
      <NavCard icon="👥" title="التشغيل والمستخدمون" subtitle="الحسابات، الأدوار، المناطق، البلاغات والحذف" onPress={()=>router.push('/admin/operations')}/>
      <NavCard icon="✅" title="طلبات الاعتماد" subtitle="مراجعة التجار والمندوبين والمستندات" badge={data.pendingApplications} onPress={()=>router.push('/admin/applications')}/>
      <NavCard icon="💳" title="الاشتراكات والعمولات" subtitle="الخدمات، الأسعار وعمولة المندوب" onPress={()=>router.push('/admin/commerce')}/>
      <NavCard icon="📣" title="الإعلانات" subtitle="أماكن الإعلان ومزود العرض" onPress={()=>router.push('/admin/commerce')}/>
    </View>

    <View style={s.footerCard}>
      <Text style={s.footerTitle}>الحالة الحالية</Text>
      <Text style={s.footerText}>المنصة تعمل • جلسة الإدارة محفوظة على هذا الجهاز • تحديث البيانات تلقائي كل دقيقة.</Text>
    </View>
  </ScrollView>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}){return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text><Text style={s.metricNote}>{note}</Text></View>}
function AttentionCard({value,title,onPress}:{value:number;title:string;onPress:()=>void}){return <Pressable onPress={onPress} style={s.attention}><Text style={s.attentionValue}>{value}</Text><Text style={s.attentionTitle}>{title}</Text><Text style={s.attentionArrow}>←</Text></Pressable>}
function NavCard({icon,title,subtitle,badge,onPress}:{icon:string;title:string;subtitle:string;badge?:number;onPress:()=>void}){return <Pressable onPress={onPress} style={s.navCard}><View style={s.navTop}><View style={s.iconWrap}><Text style={s.icon}>{icon}</Text></View>{badge?<View style={s.badge}><Text style={s.badgeText}>{badge}</Text></View>:null}</View><Text style={s.navTitle}>{title}</Text><Text style={s.navSub}>{subtitle}</Text><Text style={s.open}>فتح القسم ←</Text></Pressable>}

const s=StyleSheet.create({
  page:{flex:1,backgroundColor:'#f5f7fb'},content:{padding:20,paddingBottom:36,gap:14},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:12},
  hero:{backgroundColor:'#101828',borderRadius:28,padding:24,gap:10,shadowColor:'#000',shadowOpacity:.12,shadowRadius:20,shadowOffset:{width:0,height:8},elevation:6},heroTop:{flexDirection:'row',alignItems:'center',gap:8},liveDot:{width:9,height:9,borderRadius:5,backgroundColor:'#12b76a'},kicker:{color:'#fdb022',fontSize:13,fontWeight:'900',letterSpacing:.7},heroTitle:{color:'#fff',fontSize:31,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:15,lineHeight:24,textAlign:'right'},
  section:{fontSize:22,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:8},metrics:{flexDirection:'row',flexWrap:'wrap',gap:12},metric:{width:'48%',backgroundColor:'#fff',borderRadius:22,padding:18,borderWidth:1,borderColor:'#eaecf0'},metricLabel:{color:'#667085',fontSize:13,fontWeight:'700',textAlign:'right'},metricValue:{color:'#101828',fontSize:28,fontWeight:'900',marginVertical:4,textAlign:'right'},metricNote:{color:'#98a2b3',fontSize:12,textAlign:'right'},
  attentionRow:{flexDirection:'row',gap:12},attention:{flex:1,backgroundColor:'#fff7ed',borderRadius:20,padding:16,borderWidth:1,borderColor:'#fed7aa'},attentionValue:{fontSize:26,fontWeight:'900',color:'#ea580c',textAlign:'right'},attentionTitle:{fontSize:14,fontWeight:'800',color:'#9a3412',textAlign:'right'},attentionArrow:{fontSize:18,color:'#c2410c',marginTop:8},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:12},navCard:{width:'48%',minHeight:180,backgroundColor:'#fff',borderRadius:22,padding:18,borderWidth:1,borderColor:'#e4e7ec'},navTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},iconWrap:{width:44,height:44,borderRadius:14,backgroundColor:'#f2f4f7',alignItems:'center',justifyContent:'center'},icon:{fontSize:24},badge:{minWidth:28,height:28,borderRadius:14,backgroundColor:'#f97316',alignItems:'center',justifyContent:'center',paddingHorizontal:8},badgeText:{color:'#fff',fontWeight:'900'},navTitle:{fontSize:16,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:14},navSub:{fontSize:13,color:'#667085',lineHeight:20,textAlign:'right',marginTop:6},open:{fontSize:12,fontWeight:'800',color:'#f97316',textAlign:'right',marginTop:'auto',paddingTop:12},
  footerCard:{backgroundColor:'#ecfdf3',borderRadius:20,padding:18,borderWidth:1,borderColor:'#abefc6'},footerTitle:{fontSize:15,fontWeight:'900',color:'#067647',textAlign:'right'},footerText:{fontSize:13,lineHeight:21,color:'#067647',textAlign:'right',marginTop:5}
});
