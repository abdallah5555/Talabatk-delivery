import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Field, colors } from '@/src/components/ui';
import { ASSISTANT_QUICK_PROMPTS, buildAssistantReply, type AssistantReply } from '@/src/lib/assistant';
import { getMyOrders } from '@/src/lib/api';

type ChatMessage={id:string;role:'user'|'assistant';text:string;reply?:AssistantReply};
const seed:ChatMessage={id:'welcome',role:'assistant',text:'أهلاً بيك 👋 أنا مساعد طلباتك. قولّي محتاج إيه: منتج، خدمة، متابعة طلب، عنوان، دعم أو أي حاجة جوه التطبيق.'};

export default function AssistantScreen(){
  const orders=useQuery({queryKey:['my-orders'],queryFn:getMyOrders,staleTime:15_000});
  const [messages,setMessages]=useState<ChatMessage[]>([seed]);
  const [draft,setDraft]=useState('');
  const latest=orders.data?.[0];
  const context=useMemo(()=>({latestOrderId:latest?.id??null,latestOrderStatus:latest?.status??null,hasActiveOrder:Boolean(latest&&!['delivered','cancelled','rejected'].includes(latest.status))}),[latest]);

  function send(value=draft){
    const text=value.trim();if(!text)return;
    const reply=buildAssistantReply(text,context);
    const stamp=Date.now();
    setMessages(list=>[...list,{id:`u-${stamp}`,role:'user',text},{id:`a-${stamp}`,role:'assistant',text:reply.text,reply}]);
    setDraft('');
  }
  function run(reply:AssistantReply){
    const action=reply.action;if(!action||action.type==='none')return;
    if(action.type==='route'){router.push(action.href as never);return;}
    router.push({pathname:'/search',params:{q:action.query,category:action.category??'all',maxPrice:action.maxPrice?String(action.maxPrice):''}});
  }

  return <View style={s.page}>
    <FlatList data={messages} keyExtractor={x=>x.id} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" ListHeaderComponent={<View style={s.hero}><Text style={s.bot}>✨ مساعد طلباتك</Text><Text style={s.heroTitle}>اكتب بطريقتك</Text><Text style={s.heroText}>المساعد بيفهم أوامر كتير من غير اشتراك AI مدفوع، وبيستخدم بيانات التطبيق الحقيقية وصلاحيات حسابك.</Text><View style={s.quickWrap}>{ASSISTANT_QUICK_PROMPTS.map(x=><Pressable key={x} onPress={()=>send(x)} style={s.quick}><Text style={s.quickText}>{x}</Text></Pressable>)}</View></View>} renderItem={({item})=><View style={[s.bubble,item.role==='user'?s.userBubble:s.botBubble]}><Text style={[s.message,item.role==='user'?s.userText:s.botText]}>{item.text}</Text>{item.role==='assistant'&&item.reply?.action&&item.reply.action.type!=='none'?<Pressable onPress={()=>run(item.reply!)} style={s.action}><Text style={s.actionText}>{item.reply.action.label}</Text></Pressable>:null}</View>} />
    <View style={s.composer}><Field value={draft} onChangeText={setDraft} placeholder="مثلاً: عايز شاحن تحت 500 جنيه" accessibilityLabel="رسالة لمساعد طلباتك" onSubmitEditing={()=>send()} returnKeyType="send" style={s.input}/><Pressable disabled={!draft.trim()} onPress={()=>send()} style={[s.send,!draft.trim()&&s.sendDisabled]}><Text style={s.sendText}>إرسال</Text></Pressable></View>
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},list:{padding:16,paddingBottom:130,gap:10},hero:{backgroundColor:'#17212f',borderRadius:28,padding:20,gap:8,marginBottom:4},bot:{color:'#fdba74',fontWeight:'900',textAlign:'right'},heroTitle:{color:'#fff',fontSize:26,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:13,lineHeight:21,textAlign:'right'},quickWrap:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7,marginTop:4},quick:{backgroundColor:'#253246',borderRadius:999,paddingHorizontal:10,paddingVertical:7},quickText:{color:'#fff',fontSize:11,fontWeight:'800'},bubble:{maxWidth:'88%',padding:13,borderRadius:18,gap:9,marginVertical:3},userBubble:{alignSelf:'flex-start',backgroundColor:colors.primary,borderBottomLeftRadius:5},botBubble:{alignSelf:'flex-end',backgroundColor:'#fff',borderWidth:1,borderColor:'#e4e7ec',borderBottomRightRadius:5},message:{fontSize:14,lineHeight:22,textAlign:'right'},userText:{color:'#fff',fontWeight:'800'},botText:{color:'#344054'},action:{alignSelf:'flex-end',backgroundColor:'#fff4ed',borderWidth:1,borderColor:'#fdba74',borderRadius:12,paddingHorizontal:11,paddingVertical:8},actionText:{color:'#b93815',fontWeight:'900',fontSize:12},composer:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#e4e7ec',padding:10,paddingBottom:16,flexDirection:'row-reverse',gap:8,alignItems:'center'},input:{flex:1},send:{minHeight:48,borderRadius:14,backgroundColor:colors.primary,paddingHorizontal:16,alignItems:'center',justifyContent:'center'},sendDisabled:{opacity:.45},sendText:{color:'#fff',fontWeight:'900'}});
