import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function registerPushForCurrentUser() {
  if (Platform.OS === 'web') return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  await Notifications.setNotificationChannelAsync('orders',{name:'الطلبات',importance:Notifications.AndroidImportance.HIGH});
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
  const { error } = await supabase.from('push_tokens').upsert({user_id:user.id,token,platform:Platform.OS,updated_at:new Date().toISOString()},{onConflict:'token'});
  if (error) throw error;
  return token;
}

export function subscribeToInAppNotifications(userId:string){
  const channel=supabase.channel(`notifications:${userId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},(payload)=>{
    if(Platform.OS==='web') return;
    const row=payload.new as any;
    void Notifications.scheduleNotificationAsync({content:{title:row.title??'طلباتك دليفري',body:row.body??'',data:{kind:row.kind??'general'}},trigger:null}).catch(()=>undefined);
  }).subscribe();
  return ()=>{void supabase.removeChannel(channel);};
}
