import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { submitDriverOnboarding, submitMerchantOnboarding, uploadOnboardingImage } from '@/src/lib/onboarding';

type AccountKind = 'merchant' | 'driver';
type DocKey = 'drivingFront'|'drivingBack'|'vehicleFront'|'vehicleBack';

async function chooseImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق بالوصول للصور لاختيار الملف.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82, allowsEditing: false });
  return result.canceled ? null : result.assets[0];
}

export default function Onboarding() {
  const { role } = useLocalSearchParams<{ role?: AccountKind }>();
  const kind: AccountKind = role === 'driver' ? 'driver' : 'merchant';
  return kind === 'driver' ? <DriverForm /> : <MerchantForm />;
}

function MerchantForm() {
  const [name,setName]=useState('');
  const [category,setCategory]=useState('');
  const [address,setAddress]=useState('');
  const [logo,setLogo]=useState<string|null>(null);
  const [coords,setCoords]=useState<{latitude:number;longitude:number}|null>(null);
  const [busy,setBusy]=useState(false);

  async function pickLogo(){try{const asset=await chooseImage();if(!asset)return;setBusy(true);setLogo(await uploadOnboardingImage(asset,'merchant-logo',true));}catch(e){Alert.alert('تعذر اختيار الصورة',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  async function locate(){try{const permission=await Location.requestForegroundPermissionsAsync();if(!permission.granted)throw new Error('اسمح للتطبيق باستخدام الموقع لتحديد مكان النشاط.');const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setCoords({latitude:pos.coords.latitude,longitude:pos.coords.longitude});}catch(e){Alert.alert('تعذر تحديد الموقع',e instanceof Error?e.message:'حاول مرة أخرى');}}
  async function submit(){if(!logo||!coords||!name.trim()||!category.trim()||!address.trim())return;setBusy(true);try{await submitMerchantOnboarding({businessName:name,category,address,latitude:coords.latitude,longitude:coords.longitude,logoUrl:logo});Alert.alert('تم إرسال الطلب','حسابك جاهز وطلب النشاط وصل للإدارة. بعد الموافقة هتظهر لك لوحة التاجر والمتجر تلقائيًا.');router.replace('/account');}catch(e){Alert.alert('تعذر إرسال الطلب',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.eyebrow}>انضم كتاجر</Text><Title>خلّي نشاطك أقرب لعملائك</Title><Muted>بيانات واضحة + موقع دقيق + لوجو للنشاط. الإدارة تراجع الطلب قبل تفعيل لوحة التاجر.</Muted></View>
    <Card>
      <Text style={s.section}>بيانات النشاط</Text>
      <Field placeholder="اسم النشاط التجاري" value={name} onChangeText={setName}/>
      <Field placeholder="نوع النشاط — مطعم، سوبر ماركت، صيدلية..." value={category} onChangeText={setCategory}/>
      <Field placeholder="العنوان بالتفصيل" value={address} onChangeText={setAddress} multiline/>
    </Card>
    <Card><Text style={s.section}>هوية وموقع النشاط</Text>{logo?<Image source={{uri:logo}} style={s.preview} contentFit="cover"/>:null}<Button title={logo?'تغيير لوجو / صورة النشاط':'اختيار لوجو / صورة النشاط'} onPress={pickLogo} disabled={busy}/><Button title={coords?'✓ تم تحديد موقع النشاط':'تحديد الموقع الحالي للنشاط'} onPress={locate}/>{coords?<Muted>تم حفظ الموقع بدقة مناسبة للمراجعة والتوصيل.</Muted>:null}</Card>
    <Button title={busy?'جاري الإرسال…':'إرسال طلب التاجر للمراجعة'} onPress={submit} disabled={busy||!logo||!coords||!name.trim()||!category.trim()||!address.trim()}/>
  </ScrollView>;
}

function DriverForm(){
  const [mode,setMode]=useState<'motorcycle'|'bicycle'>('motorcycle');
  const [motorcycleType,setMotorcycleType]=useState('');
  const [photo,setPhoto]=useState<string|null>(null);
  const [docs,setDocs]=useState<Record<DocKey,string|null>>({drivingFront:null,drivingBack:null,vehicleFront:null,vehicleBack:null});
  const [busy,setBusy]=useState(false);
  async function pickPublic(){try{const asset=await chooseImage();if(!asset)return;setBusy(true);setPhoto(await uploadOnboardingImage(asset,'driver-profile',true));}catch(e){Alert.alert('تعذر اختيار الصورة',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  async function pickDoc(key:DocKey,label:string){try{const asset=await chooseImage();if(!asset)return;setBusy(true);const path=await uploadOnboardingImage(asset,`driver-${key}`,false);setDocs(v=>({...v,[key]:path}));Alert.alert('تم',`تم رفع ${label} بأمان.`);}catch(e){Alert.alert('تعذر رفع المستند',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  const motorcycleComplete=mode==='bicycle'||Boolean(motorcycleType.trim()&&docs.drivingFront&&docs.drivingBack&&docs.vehicleFront&&docs.vehicleBack);
  async function submit(){if(!photo||!motorcycleComplete)return;setBusy(true);try{await submitDriverOnboarding({transportMode:mode,motorcycleType,profilePhotoUrl:photo,drivingLicenseFrontPath:docs.drivingFront,drivingLicenseBackPath:docs.drivingBack,vehicleLicenseFrontPath:docs.vehicleFront,vehicleLicenseBackPath:docs.vehicleBack});Alert.alert('تم إرسال الطلب','الإدارة هتراجع بياناتك والمستندات. بعد الموافقة صورة البروفايل والدور هيتفعّلوا تلقائيًا.');router.replace('/account');}catch(e){Alert.alert('تعذر إرسال الطلب',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.eyebrow}>انضم كمندوب</Text><Title>ابدأ شغلك بملف موثوق</Title><Muted>الصورة الشخصية تظهر في بروفايلك بعد الموافقة. صور الرخص خاصة ولا يطلع عليها إلا صاحب الطلب والإدارة.</Muted></View>
    <Card><Text style={s.section}>وسيلة التوصيل</Text><View style={s.segment}><Choice title="موتوسيكل" active={mode==='motorcycle'} onPress={()=>setMode('motorcycle')}/><Choice title="دراجة" active={mode==='bicycle'} onPress={()=>setMode('bicycle')}/></View>{mode==='motorcycle'?<Field placeholder="نوع / موديل الموتوسيكل" value={motorcycleType} onChangeText={setMotorcycleType}/>:<Muted>مش هنطلب رخصة موتوسيكل لو هتشتغل بدراجة.</Muted>}</Card>
    <Card><Text style={s.section}>الصورة الشخصية</Text>{photo?<Image source={{uri:photo}} style={s.avatar} contentFit="cover"/>:null}<Button title={photo?'تغيير الصورة الشخصية':'اختيار صورة شخصية واضحة'} onPress={pickPublic} disabled={busy}/></Card>
    {mode==='motorcycle'?<Card><Text style={s.section}>المستندات المطلوبة</Text><DocButton title="رخصة القيادة — وش" done={!!docs.drivingFront} onPress={()=>pickDoc('drivingFront','رخصة القيادة — وش')}/><DocButton title="رخصة القيادة — ظهر" done={!!docs.drivingBack} onPress={()=>pickDoc('drivingBack','رخصة القيادة — ظهر')}/><DocButton title="رخصة الموتوسيكل — وش" done={!!docs.vehicleFront} onPress={()=>pickDoc('vehicleFront','رخصة الموتوسيكل — وش')}/><DocButton title="رخصة الموتوسيكل — ظهر" done={!!docs.vehicleBack} onPress={()=>pickDoc('vehicleBack','رخصة الموتوسيكل — ظهر')}/></Card>:null}
    <Button title={busy?'جاري الإرسال…':'إرسال طلب المندوب للمراجعة'} onPress={submit} disabled={busy||!photo||!motorcycleComplete}/>
  </ScrollView>;
}

function Choice({title,active,onPress}:{title:string;active:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.choice,active&&s.choiceActive]}><Text style={[s.choiceText,active&&s.choiceTextActive]}>{title}</Text></Pressable>}
function DocButton({title,done,onPress}:{title:string;done:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.doc,done&&s.docDone]}><Text style={s.docText}>{done?'✓ ':''}{title}</Text><Text style={s.docHint}>{done?'تم الرفع':'اضغط لاختيار صورة'}</Text></Pressable>}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7f8fa'},content:{padding:18,paddingBottom:42,gap:14,direction:'rtl'},hero:{backgroundColor:'#1f2937',borderRadius:28,padding:22,gap:8},eyebrow:{color:'#fdba74',fontWeight:'900',textAlign:'right',fontSize:13},section:{fontSize:17,fontWeight:'900',color:colors.text,textAlign:'right'},preview:{width:'100%',height:170,borderRadius:18,backgroundColor:'#eee'},avatar:{width:110,height:110,borderRadius:55,alignSelf:'center',backgroundColor:'#eee'},segment:{flexDirection:'row-reverse',gap:8},choice:{flex:1,padding:13,borderRadius:14,borderWidth:1,borderColor:colors.border,alignItems:'center',backgroundColor:'#fff'},choiceActive:{backgroundColor:colors.primary,borderColor:colors.primary},choiceText:{fontWeight:'800',color:colors.text},choiceTextActive:{color:'#fff'},doc:{padding:13,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:'#fafafa'},docDone:{borderColor:'#12b76a',backgroundColor:'#ecfdf3'},docText:{fontWeight:'800',textAlign:'right',color:colors.text},docHint:{fontSize:12,color:colors.muted,textAlign:'right'}});
