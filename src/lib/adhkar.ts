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
const SCHEDULE_VERSION=4;
const DEFAULT_INTERVAL=5;
const MIN_SCHEDULED_LEFT=12;
const BATCH_SIZE_ANDROID=240;
const BATCH_SIZE_IOS=60;
const SCHEDULE_CONCURRENCY=20;

export type AdhkarReminderState={enabled:boolean;ids:string[];intervalMinutes:number;scheduleVersion?:number;nextIndex?:number};

type ReminderItem={title:string;body:string;section:string};

export const adhkarReminderCycle:ReminderItem[]=adhkarSections.flatMap(section=>section.items.map(item=>({
  title:`${section.title} 🤲`,
  body:item.text,
  section:section.key,
})));

function batchSize(){return Platform.OS==='ios'?BATCH_SIZE_IOS:BATCH_SIZE_ANDROID;}

async function getScheduledAdhkar(){
  const scheduled=await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(request=>request.content.data?.kind==='adhkar');
}

async function cancelAllScheduledAdhkar(){
  const scheduled=await getScheduledAdhkar();
  await Promise.all(scheduled.map(request=>Notifications.cancelScheduledNotificationAsync(request.identifier).catch(()=>undefined)));
}

export async function getAdhkarReminderState():Promise<AdhkarReminderState>{
  try{
    const raw=await AsyncStorage.getItem(KEY);
    if(!raw)return{enabled:false,ids:[],intervalMinutes:DEFAULT_INTERVAL,scheduleVersion:SCHEDULE_VERSION,nextIndex:0};
    const parsed=JSON.parse(raw) as Partial<AdhkarReminderState>;
    const interval=Math.min(15,Math.max(1,Number(parsed.intervalMinutes)||DEFAULT_INTERVAL));
    return{enabled:Boolean(parsed.enabled),ids:Array.isArray(parsed.ids)?parsed.ids:[],intervalMinutes:interval,scheduleVersion:Number(parsed.scheduleVersion)||0,nextIndex:Math.max(0,Number(parsed.nextIndex)||0)};
  }catch{return{enabled:false,ids:[],intervalMinutes:DEFAULT_INTERVAL,scheduleVersion:SCHEDULE_VERSION,nextIndex:0};}
}

async function scheduleRotatingBatch(interval:number,startIndex:number){
  if(!adhkarReminderCycle.length)throw new Error('لا توجد أذكار متاحة للتذكير.');
  const size=batchSize();
  const now=Date.now();
  const jobs=Array.from({length:size},(_,i)=>{
    const cycleIndex=(startIndex+i)%adhkarReminderCycle.length;
    const item=adhkarReminderCycle[cycleIndex]!;
    return()=>Notifications.scheduleNotificationAsync({
      content:{title:item.title,body:item.body,data:{kind:'adhkar',section:item.section,cycleIndex}},
      trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(now+(i+1)*interval*60_000),channelId:Platform.OS==='android'?'adhkar':undefined},
    });
  });
  const ids:string[]=[];
  for(let offset=0;offset<jobs.length;offset+=SCHEDULE_CONCURRENCY){
    const chunk=jobs.slice(offset,offset+SCHEDULE_CONCURRENCY);
    ids.push(...await Promise.all(chunk.map(job=>job())));
  }
  return{ids,nextIndex:(startIndex+size)%adhkarReminderCycle.length};
}

export async function enableAdhkarReminders(intervalMinutes:number){
  if(Platform.OS==='web') throw new Error('التذكيرات المحلية متاحة في تطبيق الموبايل.');
  const interval=Math.min(15,Math.max(1,Math.round(intervalMinutes)));
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('adhkar',{name:'الأذكار',importance:Notifications.AndroidImportance.HIGH,vibrationPattern:[0,180,100,180]});
  const current=await Notifications.getPermissionsAsync();
  const permission=current.granted?current:await Notifications.requestPermissionsAsync();
  if(!permission.granted) throw new Error('فعّل إذن الإشعارات حتى نقدر نفكرك بالأذكار.');

  const previous=await getAdhkarReminderState();
  await cancelAllScheduledAdhkar();
  const scheduled=await scheduleRotatingBatch(interval,previous.nextIndex??0);
  const saved:AdhkarReminderState={enabled:true,ids:scheduled.ids,intervalMinutes:interval,scheduleVersion:SCHEDULE_VERSION,nextIndex:scheduled.nextIndex};
  await AsyncStorage.setItem(KEY,JSON.stringify(saved));
  return saved;
}

export async function refreshAdhkarReminderScheduleIfNeeded(){
  if(Platform.OS==='web')return;
  const saved=await getAdhkarReminderState();
  if(!saved.enabled)return;
  const scheduled=await getScheduledAdhkar();
  const needsRebuild=saved.scheduleVersion!==SCHEDULE_VERSION||scheduled.length<MIN_SCHEDULED_LEFT;
  if(!needsRebuild)return;
  await cancelAllScheduledAdhkar();
  const next=await scheduleRotatingBatch(saved.intervalMinutes,saved.nextIndex??0);
  await AsyncStorage.setItem(KEY,JSON.stringify({enabled:true,ids:next.ids,intervalMinutes:saved.intervalMinutes,scheduleVersion:SCHEDULE_VERSION,nextIndex:next.nextIndex}));
}

export async function disableAdhkarReminders(){
  const saved=await getAdhkarReminderState();
  await cancelAllScheduledAdhkar();
  await AsyncStorage.setItem(KEY,JSON.stringify({enabled:false,ids:[],intervalMinutes:saved.intervalMinutes||DEFAULT_INTERVAL,scheduleVersion:SCHEDULE_VERSION,nextIndex:saved.nextIndex??0}));
}
