import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Muted, Screen, Title, colors } from '@/src/components/ui';
import { markNotificationRead } from '@/src/lib/features';
import { supabase } from '@/src/lib/supabase';

async function loadNotifications(){
  const {data,error}=await supabase.from('notifications').select('id,title,body,kind,is_read,order_id,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  return data??[];
}

export default function Notifications(){
  const client=useQueryClient();
  const query=useQuery({queryKey:['notifications'],queryFn:loadNotifications,refetchInterval:20_000});
  async function open(item:any){
    if(!item.is_read){await markNotificationRead(item.id);await client.invalidateQueries({queryKey:['notifications']});}
    if(item.kind==='order'&&item.order_id)router.push({pathname:'/order/[id]',params:{id:item.order_id}});
  }
  return <Screen><Title>الإشعارات</Title><Muted>اضغط على إشعار الطلب علشان تفتح الطلب نفسه مباشرة.</Muted><FlatList data={query.data??[]} keyExtractor={(x:any)=>x.id} contentContainerStyle={{gap:10,paddingBottom:24}} ListEmptyComponent={<Muted>مفيش إشعارات جديدة.</Muted>} renderItem={({item}:any)=><Pressable accessibilityRole="button" onPress={()=>void open(item)}><Card><View style={s.head}><Text style={[s.title,!item.is_read&&s.unread]}>{item.title}</Text>{!item.is_read?<View style={s.dot}/>:null}</View><Muted>{item.body}</Muted><View style={s.foot}><Text style={s.date}>{new Date(item.created_at).toLocaleString('ar-EG')}</Text>{item.kind==='order'&&item.order_id?<Text style={s.open}>فتح الطلب ←</Text>:null}</View></Card></Pressable>}/></Screen>;
}

const s=StyleSheet.create({head:{flexDirection:'row-reverse',alignItems:'center',gap:7},title:{flex:1,textAlign:'right',fontWeight:'700',color:'#344054',fontSize:15},unread:{fontWeight:'900',color:'#101828'},dot:{width:8,height:8,borderRadius:4,backgroundColor:colors.primary},foot:{flexDirection:'row-reverse',justifyContent:'space-between',gap:10,alignItems:'center'},date:{fontSize:11,color:'#98a2b3'},open:{fontSize:11,fontWeight:'900',color:colors.primary}});
