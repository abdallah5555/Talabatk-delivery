import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted, Screen, Title, colors } from '@/src/components/ui';
import { getPendingApprovals, getLandingRoute } from '@/src/lib/landing';
import { supabase } from '@/src/lib/supabase';

export default function PendingApprovalScreen(){
  const pending=useQuery({queryKey:['pending-approvals'],queryFn:getPendingApprovals,refetchInterval:15000});

  async function refresh(){
    await pending.refetch();
    const route=await getLandingRoute();
    if(route!=='/pending-approval') router.replace(route);
  }

  return <Screen>
    <View style={s.hero}>
      <Text style={s.icon}>⏳</Text>
      <Title>طلبك تحت مراجعة الإدارة</Title>
      <Muted>بياناتك وصلت بنجاح. حساب التاجر أو المندوب مش بيتفعّل إلا بعد موافقة الإدارة.</Muted>
    </View>

    {pending.data?.merchant?<Card><Text style={s.role}>🏪 طلب تاجر</Text><Muted>جاري مراجعة بيانات النشاط، الموقع واللوجو.</Muted><View style={s.badge}><Text style={s.badgeText}>قيد المراجعة</Text></View></Card>:null}
    {pending.data?.driver?<Card><Text style={s.role}>🛵 طلب مندوب</Text><Muted>جاري مراجعة بياناتك، وسيلة التوصيل والمستندات المرفوعة.</Muted><View style={s.badge}><Text style={s.badgeText}>قيد المراجعة</Text></View></Card>:null}

    <Card><Muted>بعد الموافقة، التطبيق هيوجهك تلقائيًا للوحة المناسبة. لو الإدارة رفضت الطلب، دور التاجر/المندوب مش هيتفعل.</Muted><Button title={pending.isFetching?'جاري التحقق…':'تحقق من حالة الطلب'} disabled={pending.isFetching} onPress={()=>void refresh()}/></Card>

    <Button title="تسجيل الخروج" onPress={async()=>{const {error}=await supabase.auth.signOut();if(error)return Alert.alert('تعذر الخروج',error.message);router.replace('/login');}}/>
  </Screen>;
}

const s=StyleSheet.create({hero:{backgroundColor:'#fff7ed',borderRadius:26,padding:20,gap:8,borderWidth:1,borderColor:'#fed7aa'},icon:{fontSize:42,textAlign:'center'},role:{fontWeight:'900',fontSize:18,textAlign:'right',color:'#1d2939'},badge:{alignSelf:'flex-start',backgroundColor:'#fff4cc',paddingHorizontal:10,paddingVertical:6,borderRadius:999},badgeText:{color:'#8a6116',fontWeight:'900',fontSize:12}});
