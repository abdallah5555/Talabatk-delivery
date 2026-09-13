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

const KEY='talabatk:adhkar-reminders:v2';
export type AdhkarReminderState={enabled:boolean;ids:string[];intervalMinutes:number};
const DEFAULT_INTERVAL=5;
export async function getAdhkarReminderState():Promise<AdhkarReminderState>{
  try{
    const raw=await AsyncStorage.getItem(KEY);
    if(!raw)return{enabled:false,ids:[],intervalMinutes:DEFAULT_INTERVAL};
    const parsed=JSON.parse(raw) as Partial<AdhkarReminderState>;
    const interval=Math.min(15,Math.max(1,Number(parsed.intervalMinutes)||DEFAULT_INTERVAL));
    return{enabled:Boolean(parsed.enabled),ids:Array.isArray(parsed.ids)?parsed.ids:[],intervalMinutes:interval};
  }catch{return{enabled:false,ids:[],intervalMinutes:DEFAULT_INTERVAL};}
}

export async function enableAdhkarReminders(intervalMinutes:number){
  if(Platform.OS==='web') throw new Error('التذكيرات المحلية متاحة في تطبيق الموبايل.');
  const interval=Math.min(15,Math.max(1,Math.round(intervalMinutes)));
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('adhkar',{name:'الأذكار',importance:Notifications.AndroidImportance.DEFAULT});
  const current=await Notifications.getPermissionsAsync();
  const permission=current.granted?current:await Notifications.requestPermissionsAsync();
  if(!permission.granted) throw new Error('فعّل إذن الإشعارات حتى نقدر نفكرك بالأذكار.');
  await disableAdhkarReminders();
  const id=await Notifications.scheduleNotificationAsync({
    content:{title:'ذكر بسيط 🤲',body:'دقيقة ذكر تفرّق في يومك. افتح الأذكار وخد لحظة هادية.',data:{kind:'adhkar'}},
    trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:interval*60,repeats:true,channelId:'adhkar'},
  });
  const saved={enabled:true,ids:[id],intervalMinutes:interval};
  await AsyncStorage.setItem(KEY,JSON.stringify(saved));
  return saved;
}

export async function disableAdhkarReminders(){
  const saved=await getAdhkarReminderState();
  await Promise.all(saved.ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>undefined)));
  await AsyncStorage.setItem(KEY,JSON.stringify({enabled:false,ids:[],intervalMinutes:saved.intervalMinutes||DEFAULT_INTERVAL}));
}
