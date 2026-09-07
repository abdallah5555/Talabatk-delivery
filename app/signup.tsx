import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { signUpPhonePassword } from '@/src/lib/auth';

type Kind='customer'|'merchant'|'driver';
const kinds:{key:Kind;title:string;subtitle:string;icon:string}[]=[
  {key:'customer',title:'عميل',subtitle:'اطلب من المتاجر وتابع طلباتك',icon:'🛍️'},
  {key:'merchant',title:'تاجر',subtitle:'سجل نشاطك وابدأ البيع بعد المراجعة',icon:'🏪'},
  {key:'driver',title:'مندوب',subtitle:'سجل بياناتك ومستنداتك للعمل',icon:'🛵'},
];

export default function Signup(){
  const[kind,setKind]=useState<Kind>('customer');const[name,setName]=useState('');const[phone,setPhone]=useState('');const[password,setPassword]=useState('');const[confirm,setConfirm]=useState('');const[busy,setBusy]=useState(false);
  const passwordsMatch=password.length>=8&&password===confirm;
  async function submit(){if(!passwordsMatch){Alert.alert('راجع كلمة المرور','كلمتا المرور غير متطابقتين.');return;}setBusy(true);try{await signUpPhonePassword({name,phone,password});if(kind==='customer')router.replace('/home');else router.replace({pathname:'/onboarding',params:{role:kind}});}catch(e){Alert.alert('تعذر إنشاء الحساب',e instanceof Error?e.message:'راجع البيانات وحاول مرة أخرى');}finally{setBusy(false);}}
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.brand}>طلباتك</Text><Text style={s.heroTitle}>حساب واحد يبدأ صح من أول خطوة</Text><Text style={s.heroText}>اختار استخدامك، أنشئ حسابك برقم الموبايل وكلمة المرور، وبعدها نكمّل البيانات المناسبة ليك.</Text></View>
    <View style={s.kindGrid}>{kinds.map(item=><Pressable key={item.key} accessibilityRole="button" onPress={()=>setKind(item.key)} style={[s.kind,kind===item.key&&s.kindActive]}><Text style={s.kindIcon}>{item.icon}</Text><Text style={[s.kindTitle,kind===item.key&&s.kindTitleActive]}>{item.title}</Text><Text style={[s.kindSub,kind===item.key&&s.kindSubActive]}>{item.subtitle}</Text></Pressable>)}</View>
    <Card><Title>بيانات الحساب</Title><Muted>بيانات بسيطة وواضحة عشان تبدأ استخدام التطبيق بسرعة وأمان.</Muted><Field accessibilityLabel="الاسم الكامل" placeholder="الاسم الكامل" value={name} onChangeText={setName}/><Field accessibilityLabel="رقم الهاتف" keyboardType="phone-pad" placeholder="رقم الموبايل — مثال 01012345678" value={phone} onChangeText={setPhone}/><Field accessibilityLabel="كلمة المرور" placeholder="كلمة المرور — 8 أحرف على الأقل" secureTextEntry value={password} onChangeText={setPassword}/><Field accessibilityLabel="تأكيد كلمة المرور" placeholder="تأكيد كلمة المرور" secureTextEntry value={confirm} onChangeText={setConfirm}/>{confirm.length>0?<Text style={[s.match,{color:passwordsMatch?'#067647':'#b42318'}]}>{passwordsMatch?'✓ كلمة المرور متطابقة':'كلمتا المرور غير متطابقتين'}</Text>:null}<Button title={busy?'جاري إنشاء الحساب…':kind==='merchant'?'إنشاء الحساب ومتابعة بيانات النشاط':kind==='driver'?'إنشاء الحساب ومتابعة بيانات المندوب':'إنشاء حساب العميل'} onPress={submit} disabled={busy||name.trim().length<2||!phone.trim()||!passwordsMatch}/></Card>
    <Link href="/login" style={s.login}>عندي حساب بالفعل — تسجيل الدخول</Link>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f6f7f9'},content:{padding:18,paddingBottom:38,gap:15,direction:'rtl'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:24,gap:8},brand:{color:'#fb923c',fontWeight:'900',fontSize:18,textAlign:'right'},heroTitle:{color:'#fff',fontSize:27,fontWeight:'900',lineHeight:36,textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:14,lineHeight:23,textAlign:'right'},kindGrid:{gap:9},kind:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:'#e4e7ec',padding:14,flexDirection:'row-reverse',alignItems:'center',gap:10},kindActive:{backgroundColor:'#fff4ed',borderColor:colors.primary,borderWidth:2},kindIcon:{fontSize:26},kindTitle:{fontWeight:'900',fontSize:17,color:'#1d2939'},kindTitleActive:{color:'#b93815'},kindSub:{flex:1,color:'#667085',fontSize:12,textAlign:'right'},kindSubActive:{color:'#7a271a'},match:{fontSize:12,fontWeight:'800',textAlign:'right'},login:{textAlign:'center',color:colors.primary,fontWeight:'800',paddingVertical:10}});
