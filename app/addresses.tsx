import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { deleteAddress, getAddresses, saveAddress } from '@/src/lib/features';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';

const mapStyle:any={version:8,sources:{osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,attribution:'© OpenStreetMap contributors'}},layers:[{id:'osm',type:'raster',source:'osm'}]};
const labels=['المنزل','العمل','القهوة','العائلة','أخرى'];
type Point={latitude:number;longitude:number};

export default function Addresses() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const [label, setLabel] = useState('المنزل');
  const [customLabel,setCustomLabel]=useState('');
  const [address, setAddress] = useState('');
  const [point,setPoint]=useState<Point|null>(null);
  const [showMap,setShowMap]=useState(false);
  const [isDefault,setDefault]=useState(false);
  const [busy, setBusy] = useState(false);
  const [notice,setNotice]=useState<{type:'ok'|'error';text:string}|null>(null);
  const initial=useMemo<[number,number]>(()=>[31.2357,30.0444],[]);
  const center=point?[point.longitude,point.latitude] as [number,number]:initial;
  const selectedFeature:any=point?{type:'Feature',properties:{},geometry:{type:'Point',coordinates:[point.longitude,point.latitude]}}:null;

  async function locateMe(){
    setNotice(null);
    try{
      const permission=await Location.requestForegroundPermissionsAsync();
      if(!permission.granted)throw new Error('اسمح للتطبيق باستخدام الموقع علشان نحدد مكانك على الخريطة.');
      const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
      setPoint({latitude:pos.coords.latitude,longitude:pos.coords.longitude});
      setShowMap(true);
    }catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'تعذر تحديد الموقع.'});}
  }

  function choosePoint(event:any){
    const geometry=event.nativeEvent?.geometry?.coordinates;
    const lngLat=event.nativeEvent?.lngLat;
    const longitude=Array.isArray(geometry)?Number(geometry[0]):Number(lngLat?.longitude);
    const latitude=Array.isArray(geometry)?Number(geometry[1]):Number(lngLat?.latitude);
    if(Number.isFinite(latitude)&&Number.isFinite(longitude))setPoint({latitude,longitude});
  }

  async function add() {
    const finalLabel=label==='أخرى'?(customLabel.trim()||'مكان آخر'):label;
    setBusy(true);setNotice(null);
    try {
      await saveAddress({label:finalLabel,address,latitude:point?.latitude,longitude:point?.longitude,isDefault});
      setAddress('');setPoint(null);setDefault(false);setShowMap(false);setCustomLabel('');
      await client.invalidateQueries({ queryKey: ['addresses'] });
      setNotice({type:'ok',text:'تم حفظ العنوان. تقدر تضيف بيت، شغل أو أي مكان تاني.'});
    } catch (e) { setNotice({type:'error',text:e instanceof Error ? e.message : 'تعذر حفظ العنوان. حاول مرة أخرى.'}); }
    finally { setBusy(false); }
  }

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
    <Title>عناويني</Title>
    <Muted>احفظ أكتر من مكان واختار الاسم اللي يسهّل عليك الطلب بعد كده.</Muted>
    {notice?<View style={[s.notice,notice.type==='ok'?s.ok:s.bad]}><Text style={s.noticeText}>{notice.text}</Text></View>:null}
    <Card>
      <Text style={s.section}>اسم المكان</Text>
      <View style={s.chips}>{labels.map(x=><Pressable key={x} onPress={()=>setLabel(x)} style={[s.chip,label===x&&s.chipActive]}><Text style={[s.chipText,label===x&&s.chipTextActive]}>{x}</Text></Pressable>)}</View>
      {label==='أخرى'?<Field value={customLabel} onChangeText={setCustomLabel} placeholder="مثلاً النادي أو بيت العائلة" accessibilityLabel="اسم العنوان"/>:null}
      <Field value={address} onChangeText={setAddress} placeholder="العنوان بالتفصيل — الشارع، العمارة، علامة مميزة" accessibilityLabel="العنوان بالتفصيل" multiline/>
      <View style={s.two}><View style={s.flex}><Button title={point?'✓ الموقع محدد':'تحديد على الخريطة'} onPress={()=>setShowMap(v=>!v)}/></View><View style={s.flex}><Button title="موقعي الحالي" onPress={()=>void locateMe()}/></View></View>
      {showMap?<View style={s.mapWrap}><Map mapStyle={mapStyle} style={s.map} attribution logo={false} onPress={choosePoint}><Camera key={`${center[0]}:${center[1]}`} initialViewState={{center,zoom:point?15:10}}/>{selectedFeature?<GeoJSONSource id="selected-address" data={selectedFeature}><Layer id="selected-address-dot" type="circle" style={{circleRadius:9,circleColor:colors.primary,circleStrokeWidth:4,circleStrokeColor:'#ffffff'}}/></GeoJSONSource>:null}</Map><Muted>اضغط مرة واحدة على المكان المطلوب. العلامة البرتقالي هتظهر من غير فتح عناصر Native فوق الخريطة.</Muted></View>:null}
      <Pressable onPress={()=>setDefault(v=>!v)} style={s.defaultRow}><View style={[s.check,isDefault&&s.checkOn]}><Text style={s.checkText}>{isDefault?'✓':''}</Text></View><Text style={s.defaultText}>اجعله العنوان الافتراضي</Text></Pressable>
      <Button title={busy ? 'جاري الحفظ…' : 'حفظ العنوان'} onPress={add} disabled={busy || address.trim().length < 5} />
    </Card>
    <Text style={s.sectionHeading}>الأماكن المحفوظة</Text>
    {query.isLoading?<Muted>جاري تحميل عناوينك…</Muted>:null}
    {!query.isLoading&&!(query.data??[]).length?<Muted>مفيش عناوين محفوظة لسه.</Muted>:null}
    {(query.data??[]).map((item:any)=><Card key={item.id}><View style={s.addressTop}><View style={s.flex}><Text style={s.addressLabel}>{item.label}{item.is_default?' • الافتراضي':''}</Text><Muted>{item.address_line}</Muted>{item.latitude&&item.longitude?<Text style={s.coords}>📍 محدد على الخريطة</Text>:null}</View></View><Button title="حذف العنوان" onPress={async()=>{setNotice(null);try{await deleteAddress(item.id);await client.invalidateQueries({queryKey:['addresses']});setNotice({type:'ok',text:'تم حذف العنوان.'});}catch(e){setNotice({type:'error',text:e instanceof Error?e.message:'تعذر حذف العنوان.'});}}}/></Card>)}
  </ScrollView>;
}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f7fa'},content:{padding:18,paddingBottom:44,gap:12,direction:'rtl'},section:{fontSize:16,fontWeight:'900',textAlign:'right',color:'#101828'},sectionHeading:{fontSize:20,fontWeight:'900',textAlign:'right',color:'#101828',marginTop:6},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:7},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:'#f2f4f7',borderWidth:1,borderColor:'#e4e7ec'},chipActive:{backgroundColor:'#fff4ed',borderColor:colors.primary},chipText:{fontWeight:'800',color:'#475467'},chipTextActive:{color:'#b93815'},two:{flexDirection:'row-reverse',gap:8},flex:{flex:1},mapWrap:{height:340,gap:7},map:{flex:1,borderRadius:18,overflow:'hidden'},defaultRow:{flexDirection:'row-reverse',alignItems:'center',gap:10,minHeight:42},check:{width:24,height:24,borderRadius:7,borderWidth:1,borderColor:'#98a2b3',alignItems:'center',justifyContent:'center'},checkOn:{backgroundColor:colors.primary,borderColor:colors.primary},checkText:{color:'#fff',fontWeight:'900'},defaultText:{fontWeight:'800',color:'#344054'},notice:{borderRadius:15,padding:13},ok:{backgroundColor:'#ecfdf3',borderWidth:1,borderColor:'#abefc6'},bad:{backgroundColor:'#fef3f2',borderWidth:1,borderColor:'#fecdca'},noticeText:{textAlign:'right',fontWeight:'800',lineHeight:21,color:'#344054'},addressTop:{flexDirection:'row-reverse'},addressLabel:{fontSize:17,fontWeight:'900',textAlign:'right',color:'#101828'},coords:{fontSize:12,color:'#067647',fontWeight:'800',textAlign:'right',marginTop:5}});
