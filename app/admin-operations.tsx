import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Title, colors } from '@/src/components/ui';
import { createServiceArea, getAdminOverview, resolveDeletion, resolveDriverIssue, setRole, setUserActive, toggleServiceArea, updateSetting } from '@/src/lib/adminOps';

type ManagedRole='customer'|'merchant'|'driver';
const roleLabels:Record<ManagedRole,string>={customer:'عميل',merchant:'تاجر',driver:'مندوب'};

export default function AdminOperations(){
  const qc=useQueryClient();
  const overview=useQuery({queryKey:['admin-overview'],queryFn:getAdminOverview,refetchInterval:30000});
  const [search,setSearch]=useState('');
  const [areaName,setAreaName]=useState('');
  const [radius,setRadius]=useState('');
  const [busy,setBusy]=useState(false);
  const data=overview.data;
  const maintenanceValue=data?.settings.find((x:any)=>x.key==='maintenance_mode')?.value;
  const maintenance=typeof maintenanceValue==='object'&&maintenanceValue!==null?Boolean((maintenanceValue as any).enabled):Boolean(maintenanceValue);
  const capacity=Number(data?.settings.find((x:any)=>x.key==='driver_capacity')?.value??5);
  const userRoleMap=useMemo(()=>{
    const map=new Map<string,Set<string>>();
    for(const row of data?.userRoles??[]){const set=map.get((row as any).user_id)??new Set<string>();set.add((row as any).role);map.set((row as any).user_id,set);}
    return map;
  },[data?.userRoles]);
  const users=useMemo(()=>{
    const q=search.trim().toLowerCase();
    const list=data?.profiles??[];
    if(!q)return list.slice(0,80);
    return list.filter((u:any)=>`${u.full_name??''} ${u.phone??''}`.toLowerCase().includes(q)).slice(0,80);
  },[data?.profiles,search]);

  async function refresh(){await qc.invalidateQueries({queryKey:['admin-overview']});}
  async function setting(key:string,value:unknown){setBusy(true);try{await updateSetting(key,value);await refresh();}catch(e){Alert.alert('تعذر تحديث الإعداد',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  async function addArea(){const km=radius.trim()?Number(radius):null;if(km!==null&&(!Number.isFinite(km)||km<=0)){Alert.alert('راجع النطاق','اكتب نصف قطر صحيح بالكيلومتر.');return;}setBusy(true);try{await createServiceArea({name:areaName,radiusKm:km});setAreaName('');setRadius('');await refresh();}catch(e){Alert.alert('تعذر إضافة المنطقة',e instanceof Error?e.message:'حاول مرة أخرى');}finally{setBusy(false);}}
  function confirmAccount(user:any){Alert.alert(user.is_active?'إيقاف الحساب':'إعادة تفعيل الحساب',user.is_active?`سيتم منع ${user.full_name||'المستخدم'} من استخدام العمليات المحمية حتى إعادة التفعيل.`:`سيتم إعادة تفعيل حساب ${user.full_name||'المستخدم'}.`,[{text:'رجوع',style:'cancel'},{text:user.is_active?'إيقاف':'تفعيل',style:user.is_active?'destructive':'default',onPress:()=>void runUserActive(user.id,!user.is_active)}]);}
  async function runUserActive(id:string,active:boolean){try{await setUserActive(id,active);await refresh();}catch(e){Alert.alert('تعذر التنفيذ',e instanceof Error?e.message:'حاول مرة أخرى');}}
  function confirmRole(user:any,role:ManagedRole,enabled:boolean){const action=enabled?'منح':'سحب';Alert.alert(`${action} دور ${roleLabels[role]}`,`${action} دور ${roleLabels[role]} ${enabled?'يفتح':'يلغي'} صلاحيات هذا الدور لحساب ${user.full_name||user.phone||'المستخدم'}.`,[{text:'رجوع',style:'cancel'},{text:`${action} الدور`,style:enabled?'default':'destructive',onPress:()=>void runRole(user.id,role,enabled)}]);}
  async function runRole(id:string,role:ManagedRole,enabled:boolean){try{await setRole(id,role,enabled);await refresh();}catch(e){Alert.alert('تعذر تعديل الدور',e instanceof Error?e.message:'حاول مرة أخرى');}}

  if(overview.isLoading)return <View style={s.center}><Muted>جاري تحميل مركز التشغيل…</Muted></View>;
  if(overview.isError)return <View style={s.center}><Title>تعذر تحميل مركز التشغيل</Title><Muted>{overview.error instanceof Error?overview.error.message:'حاول مرة أخرى'}</Muted><Button title="إعادة المحاولة" onPress={()=>void overview.refetch()}/></View>;

  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.hero}><Text style={s.kicker}>PLATFORM OPERATIONS</Text><Text style={s.heroTitle}>تشغيل المنصة والحسابات</Text><Text style={s.heroText}>إدارة الحسابات والأدوار والمناطق والبلاغات من مكان واحد. القرارات الحساسة تحتاج تأكيد قبل التنفيذ.</Text></View>

    <View style={s.metrics}><Metric value={String(data?.profiles.length??0)} label="مستخدم"/><Metric value={String(data?.areas.filter((x:any)=>x.enabled).length??0)} label="منطقة فعالة"/><Metric value={String(data?.deletions.length??0)} label="حذف بيانات"/><Metric value={String(data?.issues.length??0)} label="بلاغ مفتوح"/></View>

    <Text style={s.section}>التشغيل العام</Text>
    <Card><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>وضع الصيانة</Text><Muted>{maintenance?'التطبيق في وضع الصيانة حاليًا':'الخدمة متاحة للمستخدمين'}</Muted></View><Status active={!maintenance} label={maintenance?'صيانة':'متاح'}/></View><Button title={maintenance?'إيقاف وضع الصيانة':'تفعيل وضع الصيانة'} disabled={busy} onPress={()=>void setting('maintenance_mode',{enabled:!maintenance,message:''})}/><View style={s.divider}/><Text style={s.cardTitle}>سعة المندوب</Text><Muted>الحد التشغيلي الحالي: {capacity} طلبات نشطة لكل مندوب.</Muted><View style={s.actions}><View style={s.flex}><Button title="− تقليل" disabled={busy||capacity<=1} onPress={()=>void setting('driver_capacity',Math.max(1,capacity-1))}/></View><View style={s.flex}><Button title="+ زيادة" disabled={busy||capacity>=20} onPress={()=>void setting('driver_capacity',Math.min(20,capacity+1))}/></View></View></Card>

    <Text style={s.section}>مناطق الخدمة</Text>
    <Card><Text style={s.cardTitle}>إضافة منطقة</Text><Field value={areaName} onChangeText={setAreaName} placeholder="اسم المنطقة"/><Field value={radius} onChangeText={setRadius} placeholder="نصف القطر بالكيلومتر — اختياري" keyboardType="decimal-pad"/><Button title="إضافة وتفعيل المنطقة" disabled={busy||areaName.trim().length<2} onPress={()=>void addArea()}/></Card>
    {(data?.areas??[]).map((a:any)=><Card key={a.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>{a.name}</Text><Muted>{a.radius_km?`${Number(a.radius_km)} كم`:'بدون نطاق محدد'}</Muted></View><Status active={a.enabled} label={a.enabled?'فعالة':'موقوفة'}/></View><Button title={a.enabled?'إيقاف المنطقة':'تفعيل المنطقة'} onPress={()=>Alert.alert(a.enabled?'إيقاف المنطقة':'تفعيل المنطقة',`${a.name} — متأكد؟`,[{text:'رجوع',style:'cancel'},{text:a.enabled?'إيقاف':'تفعيل',style:a.enabled?'destructive':'default',onPress:async()=>{try{await toggleServiceArea(a.id,!a.enabled);await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}])}/></Card>)}

    <Text style={s.section}>المستخدمون والصلاحيات</Text>
    <Field value={search} onChangeText={setSearch} placeholder="ابحث بالاسم أو رقم الهاتف"/>
    <Muted>الأدوار الجديدة للتاجر والمندوب لا تُمنح وقت التسجيل؛ الموافقة من طلبات الاعتماد هي المسار الطبيعي. التحكم هنا للحالات الإدارية الاستثنائية.</Muted>
    {users.map((u:any)=>{const roles=userRoleMap.get(u.id)??new Set<string>();return <Card key={u.id}><View style={s.row}><View style={s.flex}><Text style={s.userName}>{u.full_name||'بدون اسم'}</Text><Muted>{u.phone||'بدون رقم هاتف'}</Muted></View><Status active={u.is_active} label={u.is_active?'نشط':'موقوف'}/></View><View style={s.roleRow}>{(['customer','merchant','driver'] as ManagedRole[]).map(role=><RoleChip key={role} title={roleLabels[role]} active={roles.has(role)} onPress={()=>confirmRole(u,role,!roles.has(role))}/>)}</View>{roles.has('admin')?<View style={s.adminBadge}><Text style={s.adminBadgeText}>حساب إدارة</Text></View>:null}<Button title={u.is_active?'إيقاف الحساب':'إعادة تفعيل الحساب'} onPress={()=>confirmAccount(u)}/></Card>})}
    {!users.length?<Card><Muted>لا توجد حسابات مطابقة للبحث.</Muted></Card>:null}

    <Text style={s.section}>طلبات حذف البيانات</Text>
    {!data?.deletions.length?<Card><Muted>لا توجد طلبات حذف معلقة.</Muted></Card>:null}
    {(data?.deletions??[]).map((r:any)=><Card key={r.id}><View style={s.row}><View style={s.flex}><Text style={s.cardTitle}>طلب حذف بيانات</Text><Muted>{r.reason||'لم يذكر سببًا'} • {new Date(r.created_at).toLocaleDateString('ar-EG')}</Muted></View><Status active={r.status==='processing'} label={r.status==='processing'?'قيد المعالجة':'جديد'}/></View><View style={s.actions}><View style={s.flex}><Button title="بدء المعالجة" onPress={async()=>{try{await resolveDeletion(r.id,'processing');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></View><View style={s.flex}><Button title="رفض الطلب" onPress={()=>Alert.alert('رفض طلب الحذف','متأكد من رفض الطلب؟',[{text:'رجوع',style:'cancel'},{text:'رفض',style:'destructive',onPress:async()=>{try{await resolveDeletion(r.id,'rejected','تمت مراجعة الطلب وتعذر تنفيذه.');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}])}/></View></View></Card>)}

    <Text style={s.section}>بلاغات المندوبين</Text>
    {!data?.issues.length?<Card><Muted>لا توجد بلاغات تشغيل مفتوحة.</Muted></Card>:null}
    {(data?.issues??[]).map((i:any)=><Card key={i.id}><Text style={s.cardTitle}>{i.category}</Text><Muted>{i.message}</Muted><Muted>{new Date(i.created_at).toLocaleString('ar-EG')}</Muted><View style={s.actions}><View style={s.flex}><Button title="قيد المتابعة" onPress={async()=>{try{await resolveDriverIssue(i.id,'in_progress','قيد المتابعة من الإدارة.');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></View><View style={s.flex}><Button title="تم الحل" onPress={async()=>{try{await resolveDriverIssue(i.id,'resolved','تمت مراجعة البلاغ وحله.');await refresh();}catch(e){Alert.alert('تعذر التحديث',e instanceof Error?e.message:'حاول مرة أخرى');}}}/></View></View></Card>)}

    <Text style={s.section}>سجل التدقيق</Text>
    <Card><Muted>آخر العمليات الحساسة المسجلة على المنصة. يستخدم للمراجعة والتحقيق الإداري.</Muted></Card>
    {(data?.audit??[]).slice(0,40).map((a:any)=><View key={a.id} style={s.audit}><View style={s.auditDot}/><View style={s.flex}><Text style={s.auditTitle}>{a.action}</Text><Text style={s.auditMeta}>{a.entity_type} • {new Date(a.created_at).toLocaleString('ar-EG')}</Text></View></View>)}

    <Card><Text style={s.cardTitle}>استخدام الموارد</Text><Muted>قاعدة البيانات: {formatBytes(Number((data?.metrics as any)?.database_bytes??0))}</Muted><Muted>التخزين: {formatBytes(Number((data?.metrics as any)?.storage_bytes??0))} • الملفات: {Number((data?.metrics as any)?.storage_objects??0)}</Muted><Muted>المستخدمون المسجلون: {Number((data?.metrics as any)?.auth_users??0)} • النشطون شهريًا: {Number((data?.metrics as any)?.mau??0)}</Muted></Card>
  </ScrollView>;
}

function Metric({value,label}:{value:string;label:string}){return <View style={s.metric}><Text style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>}
function Status({active,label}:{active:boolean;label:string}){return <View style={[s.status,active?s.statusOn:s.statusOff]}><Text style={[s.statusText,active?s.statusTextOn:s.statusTextOff]}>{label}</Text></View>}
function RoleChip({title,active,onPress}:{title:string;active:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" onPress={onPress} style={[s.roleChip,active&&s.roleChipActive]}><Text style={[s.roleText,active&&s.roleTextActive]}>{active?'✓ ':''}{title}</Text></Pressable>}
function formatBytes(value:number){if(!Number.isFinite(value)||value<=0)return '0 B';const units=['B','KB','MB','GB'];let n=value,i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return `${n.toFixed(i?1:0)} ${units[i]}`;}

const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f4f6f8'},content:{padding:18,paddingBottom:48,gap:13,direction:'rtl'},center:{flex:1,justifyContent:'center',padding:22,gap:12,backgroundColor:'#f4f6f8'},hero:{backgroundColor:'#17212f',borderRadius:30,padding:22,gap:7},kicker:{color:'#fb923c',fontSize:11,fontWeight:'900',letterSpacing:1,textAlign:'right'},heroTitle:{color:'#fff',fontSize:27,fontWeight:'900',textAlign:'right'},heroText:{color:'#d0d5dd',fontSize:13,lineHeight:21,textAlign:'right'},metrics:{flexDirection:'row-reverse',gap:8,flexWrap:'wrap'},metric:{width:'48%',backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:'#eaecf0',padding:14},metricValue:{fontSize:25,fontWeight:'900',color:'#101828',textAlign:'right'},metricLabel:{fontSize:11,color:'#667085',textAlign:'right'},section:{fontSize:20,fontWeight:'900',color:'#101828',textAlign:'right',marginTop:7},cardTitle:{fontSize:17,fontWeight:'900',color:colors.text,textAlign:'right'},userName:{fontSize:18,fontWeight:'900',color:'#101828',textAlign:'right'},row:{flexDirection:'row-reverse',alignItems:'flex-start',gap:10},flex:{flex:1},actions:{flexDirection:'row-reverse',gap:8},divider:{height:1,backgroundColor:'#eaecf0',marginVertical:3},status:{borderRadius:999,paddingHorizontal:10,paddingVertical:6},statusOn:{backgroundColor:'#ecfdf3'},statusOff:{backgroundColor:'#fef3f2'},statusText:{fontSize:11,fontWeight:'900'},statusTextOn:{color:'#067647'},statusTextOff:{color:'#b42318'},roleRow:{flexDirection:'row-reverse',gap:7,flexWrap:'wrap'},roleChip:{borderWidth:1,borderColor:'#d0d5dd',borderRadius:999,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#fff'},roleChipActive:{borderColor:'#fdba74',backgroundColor:'#fff7ed'},roleText:{fontSize:12,fontWeight:'800',color:'#475467'},roleTextActive:{color:'#b93815'},adminBadge:{alignSelf:'flex-start',backgroundColor:'#eef4ff',paddingHorizontal:10,paddingVertical:6,borderRadius:999},adminBadgeText:{color:'#3538cd',fontSize:11,fontWeight:'900'},audit:{flexDirection:'row-reverse',alignItems:'flex-start',gap:10,paddingVertical:9,paddingHorizontal:4},auditDot:{width:9,height:9,borderRadius:5,backgroundColor:'#fb923c',marginTop:5},auditTitle:{fontWeight:'900',color:'#344054',textAlign:'right'},auditMeta:{fontSize:11,color:'#667085',textAlign:'right',marginTop:2}});
