import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type Dhikr = { text:string; count:number; note?:string };

export const morningAdhkar:Dhikr[]=[
  {text:'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',count:1},
  {text:'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',count:3},
  {text:'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',count:3},
  {text:'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',count:7},
  {text:'سبحان الله وبحمده.',count:100},
  {text:'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',count:1},
];

export const eveningAdhkar:Dhikr[]=[
  {text:'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',count:1},
  {text:'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد ﷺ نبيًا.',count:3},
  {text:'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',count:3},
  {text:'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',count:7},
  {text:'سبحان الله وبحمده.',count:100},
  {text:'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',count:1},
];

const KEY='talabatk:adhkar-reminders:v1';
type Saved={enabled:boolean;ids:string[]};
export async function getAdhkarReminderState():Promise<Saved>{try{const raw=await AsyncStorage.getItem(KEY);return raw?JSON.parse(raw):{enabled:false,ids:[]};}catch{return {enabled:false,ids:[]};}}

export async function enableAdhkarReminders(){
  if(Platform.OS==='web') throw new Error('التذكيرات المحلية متاحة في تطبيق الموبايل.');
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('adhkar',{name:'الأذكار',importance:Notifications.AndroidImportance.DEFAULT});
  const current=await Notifications.getPermissionsAsync();
  const permission=current.granted?current:await Notifications.requestPermissionsAsync();
  if(!permission.granted) throw new Error('فعّل إذن الإشعارات حتى نقدر نفكرك بالأذكار.');
  await disableAdhkarReminders();
  const morning=await Notifications.scheduleNotificationAsync({content:{title:'أذكار الصباح',body:'ابدأ يومك بذكر الله.',data:{kind:'adhkar',period:'morning'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:7,minute:0,channelId:'adhkar'}});
  const evening=await Notifications.scheduleNotificationAsync({content:{title:'أذكار المساء',body:'وقت أذكار المساء.',data:{kind:'adhkar',period:'evening'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:18,minute:0,channelId:'adhkar'}});
  const saved={enabled:true,ids:[morning,evening]};
  await AsyncStorage.setItem(KEY,JSON.stringify(saved));
  return saved;
}

export async function disableAdhkarReminders(){
  const saved=await getAdhkarReminderState();
  await Promise.all(saved.ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>undefined)));
  await AsyncStorage.setItem(KEY,JSON.stringify({enabled:false,ids:[]}));
}
