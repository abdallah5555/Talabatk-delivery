import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, Muted, colors } from '@/src/components/ui';
import { submitDriverOnboarding, submitMerchantOnboarding, uploadOnboardingImage } from '@/src/lib/onboarding';
import { getRegistrationKind } from '@/src/lib/landing';

type AccountKind = 'merchant' | 'driver';
type DriverDocKey = 'nationalIdFront'|'nationalIdBack'|'drivingFront'|'drivingBack'|'vehicleFront'|'vehicleBack'|'policeClearance';
type MerchantDocKey = 'nationalIdFront'|'nationalIdBack'|'commercialRegistration'|'taxCard';
type Feedback={text:string;kind:'success'|'error'|'info'}|null;

async function chooseImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق بالوصول للصور لاختيار الملف.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, allowsEditing: false });
  return result.canceled ? null : result.assets[0];
}

export default function Onboarding() {
  const { role } = useLocalSearchParams<{ role?: AccountKind }>();
  const [resolved,setResolved]=useState<AccountKind|null>(role==='driver'?'driver':role==='merchant'?'merchant':null);
  const [loading,setLoading]=useState(!resolved);
  useEffect(()=>{
    if(resolved)return;
    let active=true;
    void getRegistrationKind().then(kind=>{
      if(!active)return;
      if(kind==='merchant'||kind==='driver')setResolved(kind);
      else router.replace('/home');
    }).catch(()=>Alert.alert('تعذر التحقق من نوع الحساب','أعد تسجيل الدخول وحاول مرة أخرى.')).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[resolved]);
  if(loading||!resolved)return <View style={[s.page,{padding:24}]}><Muted>جاري تجهيز بيانات التسجيل…</Muted></View>;
  return resolved === 'driver' ? <DriverForm /> : <MerchantForm />;
}

function MerchantForm() {
  const [name,setName]=useState('');
  const [category,setCategory]=useState('');
  const [address,setAddress]=useState('');
  const [logo,setLogo]=useState<string|null>(null);
  const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
  const [docs,setDocs]=useState<Record<MerchantDocKey,string|null>>({nationalIdFront:null,nationalIdBack:null,commercialRegistration:null,taxCard:null});
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<Feedback>(null);

  async function pickLogo(){try{setFeedback(null);const asset=await chooseImage();if(!asset)return;setBusy(true);setLogo(await uploadOnboardingImage(asset,'merchant-logo',true));setFeedback({text:'تم حفظ صورة النشاط.',kind:'success'});}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر اختيار الصورة.',kind:'error'});}finally{setBusy(false);}}
  async function pickDoc(key:MerchantDocKey,label:string){try{setFeedback(null);const asset=await chooseImage();if(!asset)return;setBusy(true);const path=await uploadOnboardingImage(asset,`merchant-${key}`,false);setDocs(v=>({...v,[key]:path}));setFeedback({text:`تم رفع ${label} بأمان.`,kind:'success'});}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر رفع المستند.',kind:'error'});}finally{setBusy(false);}}
  async function locate(){try{setFeedback(null);const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('اسمح للتطبيق باستخدام الموقع لتحديد مكان النشاط.');const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCoords({latitude:pos.coords.latitude,longitude:pos.coords.longitude});setFeedback({text:'تم تحديد موقع النشاط.',kind:'success'});}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر تحديد الموقع.',kind:'error'});}}
  const requiredDocsComplete=Boolean(docs.nationalIdFront&&docs.nationalIdBack&&docs.commercialRegistration);
  async function submit(){if(!logo||!coords||!name.trim()||!category.trim()||!address.trim()||!requiredDocsComplete)return;setBusy(true);setFeedback({text:'جاري إرسال الطلب للإدارة…',kind:'info'});try{await submitMerchantOnboarding({businessName:name,category,address,latitude:coords.latitude,longitude:coords.longitude,logoUrl:logo,nationalIdFrontPath:docs.nationalIdFront!,nationalIdBackPath:docs.nationalIdBack!,commercialRegistrationPath:docs.commercialRegistration!,taxCardPath:docs.taxCard});setFeedback({text:'تم إرسال طلب التاجر بنجاح. جاري نقلك لصفحة المراجعة.',kind:'success'});router.replace('/pending-approval');}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر إرسال الطلب. حاول مرة أخرى.',kind:'error'});}finally{setBusy(false);}}

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.eyebrow}>الخطوة 2 من 2 • انضم كتاجر</Text><Text style={s.heroTitle}>خلّي نشاطك أقرب لعملائك</Text><Text style={s.heroText}>كمّل بيانات النشاط وارفع مستندات التحقق. المستندات خاصة ولا يطلع عليها إلا صاحب الحساب والإدارة.</Text></View>
    {feedback?<FeedbackCard value={feedback}/>:null}
    <Card><Text style={s.section}>بيانات النشاط</Text><Field placeholder="اسم النشاط التجاري" value={name} onChangeText={setName}/><Field placeholder="نوع النشاط — مطعم، سوبر ماركت، صيدلية..." value={category} onChangeText={setCategory}/><Field placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} multiline/></Card>
    <Card><Text style={s.section}>هوية وموقع النشاط</Text>{logo?<Image source={{uri:logo}} style={s.preview} contentFit="cover"/>:null}<Button title={logo?'تغيير لوجو / صورة النشاط':'اختيار لوجو / صورة النشاط'} onPress={pickLogo} disabled={busy}/><Button title={coords?'✓ تم تحديد موقع النشاط':'تحديد الموقع الحالي للنشاط'} onPress={locate}/>{coords?<Muted>تم حفظ الموقع بدقة مناسبة للمراجعة والتوصيل.</Muted>:null}</Card>
    <Card><Text style={s.section}>مستندات التحقق</Text><Muted>المطلوب للمراجعة: بطاقة الرقم القومي وش وظهر + السجل التجاري. البطاقة الضريبية اختيارية حاليًا.</Muted><DocButton title="بطاقة الرقم القومي — وش" done={!!docs.nationalIdFront} onPress={()=>pickDoc('nationalIdFront','بطاقة الرقم القومي — وش')}/><DocButton title="بطاقة الرقم القومي — ظهر" done={!!docs.nationalIdBack} onPress={()=>pickDoc('nationalIdBack','بطاقة الرقم القومي — ظهر')}/><DocButton title="السجل التجاري" done={!!docs.commercialRegistration} onPress={()=>pickDoc('commercialRegistration','السجل التجاري')}/><DocButton title="البطاقة الضريبية — اختياري" done={!!docs.taxCard} optional onPress={()=>pickDoc('taxCard','البطاقة الضريبية')}/></Card>
    <Button title={busy?'جاري الإرسال…':'إرسال طلب التاجر للمراجعة'} onPress={submit} disabled={busy||!logo||!coords||!name.trim()||!category.trim()||!address.trim()||!requiredDocsComplete}/>
  </ScrollView>;
}

function DriverForm(){
  const [mode,setMode]=useState<'motorcycle'|'bicycle'>('motorcycle');
  const [motorcycleType,setMotorcycleType]=useState('');
  const [photo,setPhoto]=useState<string|null>(null);
  const [docs,setDocs]=useState<Record<DriverDocKey,string|null>>({nationalIdFront:null,nationalIdBack:null,drivingFront:null,drivingBack:null,vehicleFront:null,vehicleBack:null,policeClearance:null});
  const [busy,setBusy]=useState(false);
  const [feedback,setFeedback]=useState<Feedback>(null);
  async function pickPublic(){try{setFeedback(null);const asset=await chooseImage();if(!asset)return;setBusy(true);setPhoto(await uploadOnboardingImage(asset,'driver-profile',true));setFeedback({text:'تم حفظ الصورة الشخصية.',kind:'success'});}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر اختيار الصورة.',kind:'error'});}finally{setBusy(false);}}
  async function pickDoc(key:DriverDocKey,label:string){try{setFeedback(null);const asset=await chooseImage();if(!asset)return;setBusy(true);const path=await uploadOnboardingImage(asset,`driver-${key}`,false);setDocs(v=>({...v,[key]:path}));setFeedback({text:`تم رفع ${label} بأمان.`,kind:'success'});}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر رفع المستند.',kind:'error'});}finally{setBusy(false);}}
  const identityComplete=Boolean(docs.nationalIdFront&&docs.nationalIdBack);
  const motorcycleComplete=mode==='bicycle'||Boolean(motorcycleType.trim()&&docs.drivingFront&&docs.drivingBack&&docs.vehicleFront&&docs.vehicleBack);
  async function submit(){if(!photo||!identityComplete||!motorcycleComplete)return;setBusy(true);setFeedback({text:'جاري إرسال الطلب للإدارة…',kind:'info'});try{await submitDriverOnboarding({transportMode:mode,motorcycleType,profilePhotoUrl:photo,nationalIdFrontPath:docs.nationalIdFront!,nationalIdBackPath:docs.nationalIdBack!,drivingLicenseFrontPath:docs.drivingFront,drivingLicenseBackPath:docs.drivingBack,vehicleLicenseFrontPath:docs.vehicleFront,vehicleLicenseBackPath:docs.vehicleBack,policeClearancePath:docs.policeClearance});setFeedback({text:'تم إرسال طلب المندوب بنجاح. جاري نقلك لصفحة المراجعة.',kind:'success'});router.replace('/pending-approval');}catch(e){setFeedback({text:e instanceof Error?e.message:'تعذر إرسال الطلب. حاول مرة أخرى.',kind:'error'});}finally{setBusy(false);}}
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.eyebrow}>الخطوة 2 من 2 • انضم كمندوب</Text><Text style={s.heroTitle}>ابدأ شغلك بملف موثوق</Text><Text style={s.heroText}>ارفع الهوية والصورة الشخصية والمستندات الخاصة بوسيلة التوصيل. المستندات خاصة بصاحب الحساب والإدارة فقط.</Text></View>
    {feedback?<FeedbackCard value={feedback}/>:null}
    <Card><Text style={s.section}>وسيلة التوصيل</Text><View style={s.segment}><Choice title="موتوسيكل" active={mode==='motorcycle'} onPress={()=>setMode('motorcycle')}/><Choice title="دراجة" active={mode==='bicycle'} onPress={()=>setMode('bicycle')}/></View>{mode==='motorcycle'?<Field placeholder="نوع / موديل الموتوسيكل" value={motorcycleType} onChangeText={setMotorcycleType}/>:<Muted>مش هنطلب رخصة قيادة أو رخصة موتوسيكل لو هتشتغل بدراجة.</Muted>}</Card>
    <Card><Text style={s.section}>الصورة الشخصية</Text>{photo?<Image source={{uri:photo}} style={s.avatar} contentFit="cover"/>:null}<Button title={photo?'تغيير الصورة الشخصية':'اختيار صورة شخصية واضحة'} onPress={pickPublic} disabled={busy}/></Card>
    <Card><Text style={s.section}>إثبات الهوية</Text><DocButton title="بطاقة الرقم القومي — وش" done={!!docs.nationalIdFront} onPress={()=>pickDoc('nationalIdFront','بطاقة الرقم القومي — وش')}/><DocButton title="بطاقة الرقم القومي — ظهر" done={!!docs.nationalIdBack} onPress={()=>pickDoc('nationalIdBack','بطاقة الرقم القومي — ظهر')}/></Card>
    {mode==='motorcycle'?<Card><Text style={s.section}>مستندات الموتوسيكل</Text><DocButton title="رخصة القيادة — وش" done={!!docs.drivingFront} onPress={()=>pickDoc('drivingFront','رخصة القيادة — وش')}/><DocButton title="رخصة القيادة — ظهر" done={!!docs.drivingBack} onPress={()=>pickDoc('drivingBack','رخصة القيادة — ظهر')}/><DocButton title="رخصة الموتوسيكل — وش" done={!!docs.vehicleFront} onPress={()=>pickDoc('vehicleFront','رخصة الموتوسيكل — وش')}/><DocButton title="رخصة الموتوسيكل — ظهر" done={!!docs.vehicleBack} onPress={()=>pickDoc('vehicleBack','رخصة الموتوسيكل — ظهر')}/></Card>:null}
    <Card><Text style={s.section}>مستند إضافي</Text><DocButton title="صحيفة الحالة الجنائية / فيش — اختياري حاليًا" done={!!docs.policeClearance} optional onPress={()=>pickDoc('policeClearance','صحيفة الحالة الجنائية')}/></Card>
    <Button title={busy?'جاري الإرسال…':'إرسال طلب المندوب للمراجعة'} onPress={submit} disabled={busy||!photo||!identityComplete||!motorcycleComplete}/>
  </ScrollView>;
}

function FeedbackCard({value}:{value:Exclude<Feedback,null>}){return <View style={[s.feedback,value.kind==='success'?s.feedbackOk:value.kind==='error'?s.feedbackError:s.feedbackInfo]}><Text style={s.feedbackTitle}>{value.kind==='success'?'تم بنجاح':value.kind==='error'?'محتاجين نراجع حاجة':'جاري التنفيذ'}</Text><Text style={s.feedbackText}>{value.text}</Text></View>}
function Choice({title,active,onPress}:{title:string;active:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.choice,active&&s.choiceActive]}><Text style={[s.choiceText,active&&s.choiceTextActive]}>{title}</Text></Pressable>}
function DocButton({title,done,onPress,optional=false}:{title:string;done:boolean;onPress:()=>void;optional?:boolean}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.doc,done&&s.docDone]}><Text style={s.docText}>{done?'✓ ':''}{title}</Text><Text style={s.docHint}>{done?'تم الرفع':optional?'اختياري — اضغط للرفع':'مطلوب — اضغط لاختيار صورة'}</Text></Pressable>}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7f8fa'},content:{padding:18,paddingBottom:42,gap:14,direction:'rtl'},hero:{backgroundColor:'#1f2937',borderRadius:28,padding:22,gap:8},eyebrow:{color:'#fdba74',fontWeight:'900',textAlign:'right',fontSize:13},heroTitle:{color:'#fff',fontSize:26,lineHeight:36,fontWeight:'900',textAlign:'right'},heroText:{color:'#e4e7ec',fontSize:14,lineHeight:24,textAlign:'right'},section:{fontSize:17,lineHeight:26,fontWeight:'900',color:colors.text,textAlign:'right'},preview:{width:'100%',height:170,borderRadius:18,backgroundColor:'#eee'},avatar:{width:110,height:110,borderRadius:55,alignSelf:'center',backgroundColor:'#eee'},segment:{flexDirection:'row-reverse',gap:8},choice:{flex:1,padding:13,borderRadius:14,borderWidth:1,borderColor:colors.border,alignItems:'center',backgroundColor:'#fff'},choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},choiceText:{fontWeight:'800',color:colors.text},choiceTextActive:{color:'#fff'},doc:{padding:13,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:'#fafafa'},docDone:{borderColor:'#12b76a',backgroundColor:'#ecfdf3'},docText:{fontWeight:'800',fontSize:15,lineHeight:24,textAlign:'right',color:colors.text},docHint:{fontSize:12,lineHeight:20,color:colors.muted,textAlign:'right'},feedback:{borderRadius:18,padding:15,borderWidth:1,gap:4},feedbackOk:{backgroundColor:'#ecfdf3',borderColor:'#abefc6'},feedbackError:{backgroundColor:'#fef3f2',borderColor:'#fecdca'},feedbackInfo:{backgroundColor:'#eff8ff',borderColor:'#b2ddff'},feedbackTitle:{fontSize:15,fontWeight:'900',textAlign:'right',color:'#101828'},feedbackText:{fontSize:13,lineHeight:22,textAlign:'right',color:'#344054'}});
