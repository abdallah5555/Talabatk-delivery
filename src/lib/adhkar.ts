import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type Dhikr = { text:string; count:number; note?:string };
export type DhikrSection={key:string;title:string;items:Dhikr[]};

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

export const adhkarSections:DhikrSection[]=[
  {key:'morning',title:'أذكار الصباح',items:morningAdhkar},
  {key:'evening',title:'أذكار المساء',items:eveningAdhkar},
  {key:'after-prayer',title:'أذكار بعد الصلاة',items:[
    {text:'أستغفر الله.',count:3},
    {text:'اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام.',count:1},
    {text:'سبحان الله.',count:33},{text:'الحمد لله.',count:33},{text:'الله أكبر.',count:33},
  ]},
  {key:'sleep',title:'أذكار النوم',items:[
    {text:'باسمك اللهم أموت وأحيا.',count:1},
    {text:'سبحان الله.',count:33},{text:'الحمد لله.',count:33},{text:'الله أكبر.',count:34},
  ]},
  {key:'wake',title:'أذكار الاستيقاظ',items:[
    {text:'الحمد لله الذي أحيانا بعدما أماتنا وإليه النشور.',count:1},
    {text:'الحمد لله الذي عافاني في جسدي ورد علي روحي وأذن لي بذكره.',count:1},
  ]},
  {key:'food',title:'أذكار الطعام والشراب',items:[
    {text:'بسم الله.',count:1,note:'قبل الطعام'},
    {text:'الحمد لله الذي أطعمني هذا ورزقنيه من غير حول مني ولا قوة.',count:1,note:'بعد الطعام'},
  ]},
  {key:'home',title:'أذكار المنزل',items:[
    {text:'بسم الله ولجنا، وبسم الله خرجنا، وعلى ربنا توكلنا.',count:1},
  ]},
  {key:'travel',title:'أذكار السفر',items:[
    {text:'سبحان الذي سخر لنا هذا وما كنا له مقرنين وإنا إلى ربنا لمنقلبون.',count:1},
    {text:'اللهم إنا نسألك في سفرنا هذا البر والتقوى ومن العمل ما ترضى.',count:1},
  ]},
  {key:'general',title:'أذكار عامة',items:[
    {text:'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',count:10},
    {text:'سبحان الله وبحمده، سبحان الله العظيم.',count:10},
    {text:'لا حول ولا قوة إلا بالله.',count:10},
    {text:'اللهم صل وسلم على نبينا محمد.',count:10},
  ]},
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
    content:{title:'ذكر بسيط 🤲',body:'خد لحظة ذكر هادية من يومك.',data:{kind:'adhkar'}},
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
