import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AppProviders';

type Details={id:string;full_name:string;phone:string|null;avatar_url:string|null;delivery_instructions:string|null;accessibility_notes:string|null;preferred_contact:'call'|'chat'|'either'|null};

async function loadProfile():Promise<Details>{
  const {data,error}=await supabase.rpc('get_my_profile_details');
  if(error)throw error;
  const row=(Array.isArray(data)?data[0]:data) as Details|undefined;
  if(!row)throw new Error('تعذر تحميل بيانات الحساب.');
  return row;
}

export default function Profile(){
  const {session}=useAuth();
  const client=useQueryClient();
  const query=useQuery({queryKey:['profile-details',session?.user.id],queryFn:loadProfile,enabled:Boolean(session?.user.id)});
  const [name,setName]=useState('');
  const [avatar,setAvatar]=useState<string|null>(null);
  const [delivery,setDelivery]=useState('');
  const [accessibility,setAccessibility]=useState('');
  const [contact,setContact]=useState<'call'|'chat'|'either'>('either');
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const p=query.data;
    if(!p)return;
    setName(p.full_name||'');setAvatar(p.avatar_url||null);setDelivery(p.delivery_instructions||'');setAccessibility(p.accessibility_notes||'');setContact(p.preferred_contact||'either');
  },[query.data]);

  async function choosePhoto(){
    const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!permission.granted){Alert.alert('إذن الصور','اسمح للتطبيق بالوصول للصور لاختيار صورة للحساب.');return;}
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.82});
    if(picked.canceled)return;
    const asset=picked.assets[0];
    if(!session?.user.id)return;
    setBusy(true);
    try{
      const response=await fetch(asset.uri);
      const body=await response.arrayBuffer();
      const mime=asset.mimeType&&['image/jpeg','image/png','image/webp'].includes(asset.mimeType)?asset.mimeType:'image/jpeg';
      const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg';
      const path=`${session.user.id}/avatar.${ext}`;
      const {error}=await supabase.storage.from('profile-avatars').upload(path,body,{contentType:mime,upsert:true,cacheControl:'3600'});
      if(error)throw error;
      const {data}=supabase.storage.from('profile-avatars').getPublicUrl(path);
      setAvatar(`${data.publicUrl}?v=${Date.now()}`);
    }catch(e){Alert.alert('تعذر رفع الصورة',e instanceof Error?e.message:'حاول مرة أخرى.');}
    finally{setBusy(false);}
  }

  async function save(){
    if(name.trim().length<2){Alert.alert('الاسم','اكتب اسمك بشكل صحيح.');return;}
    setBusy(true);
    try{
      const {error}=await supabase.rpc('update_my_profile_details',{p_full_name:name.trim(),p_avatar_url:avatar,p_delivery_instructions:delivery.trim()||null,p_accessibility_notes:accessibility.trim()||null,p_preferred_contact:contact});
      if(error)throw error;
      await Promise.all([client.invalidateQueries({queryKey:['profile-details']}),client.invalidateQueries({queryKey:['profile-summary']})]);
      Alert.alert('تم الحفظ','تم تحديث بيانات حسابك.');
    }catch(e){Alert.alert('تعذر الحفظ',e instanceof Error?e.message:'حاول مرة أخرى.');}
    finally{setBusy(false);}
  }

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Title>ملفي الشخصي</Title>
    <Muted>خلي بياناتك محدثة عشان الطلبات والتواصل يبقوا أسهل.</Muted>
    <Card>
      <View style={s.avatarRow}>
        {avatar?<Image source={{uri:avatar}} style={s.avatar} contentFit="cover"/>:<View style={s.placeholder}><Text style={s.letter}>{(name||'ط')[0]}</Text></View>}
        <View style={s.flex}><Text style={s.section}>صورتك</Text><Muted>اختياري — صورة واضحة تساعد على تخصيص حسابك.</Muted><Button title={busy?'جاري الرفع…':'اختيار صورة'} onPress={()=>void choosePhoto()} disabled={busy}/></View>
      </View>
    </Card>
    <Card>
      <Text style={s.section}>البيانات الأساسية</Text>
      <Field value={name} onChangeText={setName} placeholder="الاسم الكامل" accessibilityLabel="الاسم الكامل"/>
      <View style={s.readOnly}><Text style={s.readLabel}>رقم الموبايل</Text><Text style={s.readValue}>{query.data?.phone||'—'}</Text></View>
    </Card>
    <Card>
      <Text style={s.section}>تفضيلات التوصيل</Text>
      <Field value={delivery} onChangeText={setDelivery} placeholder="مثلاً: اتصل قبل الوصول، اترك الطلب عند الباب" accessibilityLabel="تعليمات التوصيل" multiline/>
      <Text style={s.section}>أفضل طريقة للتواصل</Text>
      <View style={s.chips}>{([['call','مكالمة'],['chat','رسالة'],['either','أي طريقة']] as const).map(([value,label])=><Pressable key={value} onPress={()=>setContact(value)} style={[s.chip,contact===value&&s.chipOn]}><Text style={[s.chipText,contact===value&&s.chipTextOn]}>{label}</Text></Pressable>)}</View>
    </Card>
    <Card>
      <Text style={s.section}>ملاحظات مساعدة للتوصيل</Text>
      <Muted>اختياري — مثال: صعوبة في الحركة، يفضّل عدم استخدام السلم، أو أي تعليمات تساعد المندوب.</Muted>
      <Field value={accessibility} onChangeText={setAccessibility} placeholder="اكتب أي ملاحظة مهمة" accessibilityLabel="ملاحظات مساعدة للتوصيل" multiline/>
    </Card>
    <Button title={busy?'جاري الحفظ…':'حفظ التغييرات'} onPress={()=>void save()} disabled={busy||query.isLoading}/>
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:12,direction:'rtl'},avatarRow:{flexDirection:'row-reverse',alignItems:'center',gap:14},avatar:{width:92,height:92,borderRadius:28,backgroundColor:'#e4e7ec'},placeholder:{width:92,height:92,borderRadius:28,backgroundColor:'#17212f',alignItems:'center',justifyContent:'center'},letter:{fontSize:36,fontWeight:'900',color:'#fff'},flex:{flex:1,gap:7},section:{fontSize:16,fontWeight:'900',textAlign:'right',color:'#101828'},readOnly:{padding:13,borderRadius:14,backgroundColor:'#f8fafc',borderWidth:1,borderColor:'#e4e7ec'},readLabel:{fontSize:11,color:'#667085',textAlign:'right'},readValue:{fontWeight:'900',color:'#344054',textAlign:'right',marginTop:3},chips:{flexDirection:'row-reverse',gap:8,flexWrap:'wrap'},chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:999,backgroundColor:'#f2f4f7',borderWidth:1,borderColor:'#e4e7ec'},chipOn:{backgroundColor:'#fff4ed',borderColor:colors.primary},chipText:{fontWeight:'800',color:'#475467'},chipTextOn:{color:'#b93815'}});
