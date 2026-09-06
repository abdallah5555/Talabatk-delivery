import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Pressable, Text, View } from 'react-native';
import type { AdPlacement } from '@/src/lib/ads';
import { GoogleAdBanner } from './GoogleAdBanner';

export function AdSlot({ad}:{ad:AdPlacement|null|undefined}){
  if(!ad) return null;
  if(ad.provider==='direct'){
    if(!ad.media_url) return null;
    return <Pressable accessibilityRole={ad.target_url?'link':undefined} accessibilityLabel={`إعلان: ${ad.title}`} onPress={()=>{if(ad.target_url) void Linking.openURL(ad.target_url);}} style={{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:'#e5e7eb',backgroundColor:'#fff'}}>
      <Image source={{uri:ad.media_url}} style={{width:'100%',aspectRatio:16/5}} contentFit="cover" autoplay accessibilityLabel={ad.title}/>
      <View style={{paddingHorizontal:10,paddingVertical:6,flexDirection:'row-reverse',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:11,color:'#6b7280'}}>إعلان</Text>{ad.description?<Text numberOfLines={1} style={{fontSize:12,color:'#374151',flex:1,textAlign:'right'}}>{ad.description}</Text>:null}</View>
    </Pressable>;
  }
  if(ad.provider==='google'){
    return <View accessibilityLabel="إعلان Google" style={{alignItems:'center',justifyContent:'center',minHeight:50}}><GoogleAdBanner unitId={ad.google_ad_unit_id}/></View>;
  }
  return <View accessibilityLabel="مساحة إعلانية" style={{minHeight:56,borderRadius:14,borderWidth:1,borderColor:'#e5e7eb',alignItems:'center',justifyContent:'center',padding:10}}><Text style={{fontSize:11,color:'#9ca3af'}}>مساحة إعلانية</Text></View>;
}
