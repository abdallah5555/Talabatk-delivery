import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Field, Muted, colors } from '@/src/components/ui';
import { getOrderMessages, sendOrderMessage, subscribeToOrderMessages, type OrderMessage } from '@/src/lib/orderChat';
import { useAuth } from '@/src/providers/AppProviders';

export default function OrderChat(){
  const {id}=useLocalSearchParams<{id:string}>();
  const {session}=useAuth();
  const qc=useQueryClient();
  const [draft,setDraft]=useState('');
  const [busy,setBusy]=useState(false);
  const query=useQuery({queryKey:['order-chat',id],queryFn:()=>getOrderMessages(id!),enabled:Boolean(id)});
  useEffect(()=>{if(!id)return;return subscribeToOrderMessages(id,message=>qc.setQueryData<OrderMessage[]>(['order-chat',id],old=>old?.some(x=>x.id===message.id)?old:[...(old??[]),message]));},[id,qc]);
  const data=useMemo(()=>query.data??[],[query.data]);
  async function send(){
    if(!id||busy||!draft.trim())return;
    const text=draft;setDraft('');setBusy(true);
    try{const message=await sendOrderMessage(id,text);qc.setQueryData<OrderMessage[]>(['order-chat',id],old=>old?.some(x=>x.id===message.id)?old:[...(old??[]),message]);}
    catch{setDraft(text);}
    finally{setBusy(false);}
  }
  return <View style={s.page}>
    <View style={s.notice}><Text style={s.noticeTitle}>شات الطلب</Text><Text style={s.noticeText}>استخدمه للمعلومات المرتبطة بالطلب فقط، زي العنوان أو الوصول. الرسائل محفوظة لحماية كل الأطراف.</Text></View>
    <FlatList data={data} keyExtractor={x=>x.id} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" ListEmptyComponent={query.isLoading?<Muted>جاري تحميل الرسائل…</Muted>:<Muted>مفيش رسائل لسه. ابعت أول رسالة.</Muted>} renderItem={({item})=>{const mine=item.sender_id===session?.user.id;return <View style={[s.bubble,mine?s.mine:s.theirs]}><Text style={[s.message,mine&&s.mineText]}>{item.message}</Text><Text style={[s.time,mine&&s.mineTime]}>{new Date(item.created_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</Text></View>}} />
    {query.isError?<View style={s.error}><Text style={s.errorText}>تعذر فتح الشات. الشات متاح لأطراف الطلب فقط.</Text></View>:null}
    <View style={s.composer}><Field value={draft} onChangeText={setDraft} placeholder="اكتب رسالة بخصوص الطلب" accessibilityLabel="رسالة الطلب" maxLength={1000} onSubmitEditing={()=>void send()} returnKeyType="send" style={s.input}/><Pressable disabled={busy||!draft.trim()||query.isError} onPress={()=>void send()} style={[s.send,(busy||!draft.trim()||query.isError)&&s.disabled]}><Text style={s.sendText}>{busy?'…':'إرسال'}</Text></Pressable></View>
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},notice:{margin:14,marginBottom:0,backgroundColor:'#fffaeb',borderWidth:1,borderColor:'#fedf89',borderRadius:18,padding:13,gap:4},noticeTitle:{fontWeight:'900',color:'#93370d',textAlign:'right'},noticeText:{fontSize:11,lineHeight:18,color:'#93370d',textAlign:'right'},list:{padding:16,paddingBottom:110,gap:7},bubble:{maxWidth:'82%',padding:11,borderRadius:17,gap:4},mine:{alignSelf:'flex-start',backgroundColor:colors.primary,borderBottomLeftRadius:4},theirs:{alignSelf:'flex-end',backgroundColor:'#fff',borderWidth:1,borderColor:'#e4e7ec',borderBottomRightRadius:4},message:{fontSize:14,lineHeight:21,color:'#344054',textAlign:'right'},mineText:{color:'#fff',fontWeight:'700'},time:{fontSize:9,color:'#98a2b3'},mineTime:{color:'#ffedd5'},composer:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#e4e7ec',padding:10,paddingBottom:16,flexDirection:'row-reverse',alignItems:'center',gap:8},input:{flex:1},send:{minHeight:48,borderRadius:14,backgroundColor:colors.primary,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},disabled:{opacity:.45},sendText:{color:'#fff',fontWeight:'900'},error:{marginHorizontal:16,backgroundColor:'#fef3f2',borderRadius:14,padding:11},errorText:{textAlign:'right',color:'#b42318',fontWeight:'800'}});
