import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getComplaints, submitComplaint } from '@/src/lib/features';
import { getMyOrders } from '@/src/lib/api';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';

const ISSUE_TYPES=[
  {key:'missing',label:'منتج ناقص',subject:'منتج ناقص من الطلب',hint:'اكتب اسم المنتج الناقص والكمية.'},
  {key:'wrong',label:'طلب غلط',subject:'منتج أو طلب غير صحيح',hint:'اكتب إيه اللي وصلك غلط وإيه اللي كنت طالبه.'},
  {key:'damaged',label:'منتج تالف',subject:'منتج تالف أو مكسور',hint:'اوصف حالة المنتج وقت الاستلام.'},
  {key:'late',label:'الطلب متأخر',subject:'تأخير في توصيل الطلب',hint:'اكتب قد إيه الطلب متأخر وأي تفاصيل مهمة.'},
  {key:'driver',label:'مشكلة مع المندوب',subject:'مشكلة مع المندوب',hint:'اكتب المشكلة بهدوء وبالتفصيل.'},
  {key:'merchant',label:'مشكلة مع التاجر',subject:'مشكلة مع التاجر',hint:'اكتب اللي حصل مع المتجر أو المنتج.'},
  {key:'payment',label:'مشكلة دفع',subject:'مشكلة في الدفع',hint:'اكتب طريقة الدفع وإيه المشكلة من غير كتابة بيانات حساسة.'},
  {key:'other',label:'مشكلة أخرى',subject:'مشكلة أخرى',hint:'اكتب كل التفاصيل اللي تساعدنا نفهم المشكلة.'},
] as const;

export default function Support() {
  const client=useQueryClient();
  const complaints=useQuery({queryKey:['complaints'],queryFn:getComplaints});
  const orders=useQuery({queryKey:['orders'],queryFn:getMyOrders});
  const [issueKey,setIssueKey]=useState<(typeof ISSUE_TYPES)[number]['key']>('missing');
  const selectedIssue=ISSUE_TYPES.find(x=>x.key===issueKey)??ISSUE_TYPES[0];
  const [orderId,setOrderId]=useState<string|null>(null);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);

  async function send(){
    if(message.trim().length<5)return;
    setBusy(true);
    try{
      await submitComplaint({orderId,subject:selectedIssue.subject,message:message.trim()});
      setMessage('');
      await client.invalidateQueries({queryKey:['complaints']});
      Alert.alert('تم إرسال المشكلة','اتسجلت في حسابك، وهتقدر تتابع حالتها ورد الإدارة من هنا.');
    }catch(e){Alert.alert('تعذر إرسال المشكلة',e instanceof Error?e.message:'حاول مرة أخرى');}
    finally{setBusy(false);}
  }

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.eyebrow}>مركز حل المشاكل</Text><Text style={s.heroTitle}>مشكلة في طلب؟</Text><Text style={s.heroText}>اختار نوع المشكلة والطلب المقصود، واكتب التفاصيل. هنحفظ المتابعة كلها داخل حسابك.</Text></View>

    <Text style={s.section}>1. نوع المشكلة</Text>
    <View style={s.chips}>{ISSUE_TYPES.map(issue=><Pressable key={issue.key} onPress={()=>setIssueKey(issue.key)} style={[s.chip,issueKey===issue.key&&s.chipOn]}><Text style={[s.chipText,issueKey===issue.key&&s.chipTextOn]}>{issue.label}</Text></Pressable>)}</View>

    <Text style={s.section}>2. اختار الطلب</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.orderRow}>
      <Pressable onPress={()=>setOrderId(null)} style={[s.orderCard,!orderId&&s.orderCardOn]}><Text style={s.orderTitle}>بدون طلب محدد</Text><Text style={s.orderSub}>مشكلة عامة</Text></Pressable>
      {(orders.data??[]).slice(0,8).map(order=><Pressable key={order.id} onPress={()=>setOrderId(order.id)} style={[s.orderCard,orderId===order.id&&s.orderCardOn]}><Text style={s.orderTitle}>طلب #{order.id.slice(0,8)}</Text><Text style={s.orderSub}>{new Date(order.created_at).toLocaleDateString('ar-EG')} • {order.total.toFixed(0)} ج</Text></Pressable>)}
    </ScrollView>

    <Text style={s.section}>3. اشرح المشكلة</Text>
    <Card><Text style={s.subject}>{selectedIssue.subject}</Text><Muted>{selectedIssue.hint}</Muted><Field value={message} onChangeText={setMessage} placeholder="اكتب التفاصيل هنا" accessibilityLabel="تفاصيل المشكلة" multiline style={{minHeight:110,textAlignVertical:'top'}}/><Button title={busy?'جاري الإرسال…':'إرسال المشكلة'} onPress={()=>void send()} disabled={busy||message.trim().length<5}/></Card>

    <Text style={s.section}>متابعاتك السابقة</Text>
    {(complaints.data??[]).length===0?<Card><Muted>مفيش مشاكل مسجلة حاليًا.</Muted></Card>:(complaints.data??[]).map((item:any)=><Card key={item.id}><View style={s.complaintHead}><Text style={s.subject}>{item.subject}</Text><Text style={s.status}>{statusLabel(item.status)}</Text></View><Muted>{item.message}</Muted>{item.order_id?<Muted>مرتبطة بطلب #{String(item.order_id).slice(0,8)}</Muted>:null}{item.admin_note?<View style={s.reply}><Text style={s.replyTitle}>رد الإدارة</Text><Text style={s.replyText}>{item.admin_note}</Text></View>:null}</Card>)}
  </ScrollView>;
}

function statusLabel(status:string){return({open:'مفتوحة',in_progress:'قيد المتابعة',resolved:'تم الحل',closed:'مغلقة'} as Record<string,string>)[status]??status;}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:13,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:28,padding:22,gap:7},eyebrow:{color:'#fb923c',fontWeight:'900',fontSize:12,textAlign:'right'},heroTitle:{color:'#fff',fontSize:27,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:13,lineHeight:22,textAlign:'right'},section:{fontSize:19,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:3},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8},chip:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d0d5dd',borderRadius:999,paddingHorizontal:12,paddingVertical:9},chipOn:{backgroundColor:'#fff4ed',borderColor:colors.primary},chipText:{fontWeight:'800',color:'#475467',fontSize:12},chipTextOn:{color:'#b93815'},orderRow:{gap:9,direction:'rtl'},orderCard:{width:190,backgroundColor:'#fff',borderWidth:1,borderColor:'#eaecf0',borderRadius:17,padding:13,gap:5},orderCardOn:{borderColor:colors.primary,backgroundColor:'#fff8f3',borderWidth:2},orderTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},orderSub:{fontSize:11,color:'#667085',textAlign:'right'},subject:{fontWeight:'900',fontSize:16,color:'#101828',textAlign:'right'},complaintHead:{flexDirection:'row-reverse',justifyContent:'space-between',gap:10,alignItems:'flex-start'},status:{fontSize:11,fontWeight:'900',color:'#067647',backgroundColor:'#ecfdf3',borderRadius:999,paddingHorizontal:9,paddingVertical:5},reply:{backgroundColor:'#f8fafc',borderRadius:14,padding:11,gap:4},replyTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},replyText:{color:'#475467',textAlign:'right',lineHeight:21}});
