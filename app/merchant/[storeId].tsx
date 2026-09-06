import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, Text, View } from 'react-native';
import { Button, Card, Field, Muted, Screen, Title } from '@/src/components/ui';
import { addInventoryItem, addMenuItem, adjustInventory, getInventory, getMerchantMenu, setMenuAvailability, updateMenuPrice } from '@/src/lib/merchantOps';

export default function MerchantStoreManagement() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'menu'|'inventory'>('menu');
  const menu = useQuery({ queryKey: ['merchant-menu', storeId], queryFn: () => getMerchantMenu(storeId!), enabled: Boolean(storeId) });
  const inventory = useQuery({ queryKey: ['merchant-inventory', storeId], queryFn: () => getInventory(storeId!), enabled: Boolean(storeId) });

  return <Screen>
    <Title>إدارة المتجر</Title>
    <Button title="التقارير ونقطة البيع POS" onPress={() => router.push(`/merchant/report/${storeId}`)} />
    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
      <View style={{ flex: 1 }}><Button title="المنيو" onPress={() => setTab('menu')} /></View>
      <View style={{ flex: 1 }}><Button title="المخزون" onPress={() => setTab('inventory')} /></View>
    </View>
    {tab === 'menu' ? <MenuSection storeId={storeId!} rows={menu.data ?? []} refresh={() => qc.invalidateQueries({ queryKey: ['merchant-menu', storeId] })} /> : <InventorySection storeId={storeId!} rows={inventory.data ?? []} refresh={() => qc.invalidateQueries({ queryKey: ['merchant-inventory', storeId] })} />}
  </Screen>;
}

function MenuSection({ storeId, rows, refresh }: { storeId: string; rows: any[]; refresh: () => Promise<unknown> }) {
  const [name,setName] = useState(''); const [price,setPrice] = useState(''); const [category,setCategory] = useState(''); const [description,setDescription] = useState(''); const [busy,setBusy] = useState(false);
  async function create() {
    const parsed = Number(price);
    setBusy(true);
    try { await addMenuItem({ storeId, name, price: parsed, category, description }); setName(''); setPrice(''); setCategory(''); setDescription(''); await refresh(); }
    catch (e) { Alert.alert('تعذر إضافة المنتج', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }
  async function toggle(row: any) { try { await setMenuAvailability(row.id,!row.is_available); await refresh(); } catch(e) { Alert.alert('تعذر التحديث', e instanceof Error ? e.message : 'حاول مرة أخرى'); } }
  async function changePrice(row: any) {
    const next = Number(row.__price ?? row.price);
    try { await updateMenuPrice(row.id,next); await refresh(); } catch(e) { Alert.alert('تعذر تحديث السعر', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
  }
  return <>
    <Title>المنيو</Title>
    <Card>
      <Field placeholder="اسم المنتج" value={name} onChangeText={setName} />
      <Field placeholder="السعر" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
      <Field placeholder="القسم" value={category} onChangeText={setCategory} />
      <Field placeholder="الوصف" value={description} onChangeText={setDescription} />
      <Button title={busy ? 'جاري الإضافة…' : 'إضافة منتج'} disabled={busy} onPress={create} />
    </Card>
    <FlatList data={rows} keyExtractor={(x) => x.id} contentContainerStyle={{ gap: 10 }} ListEmptyComponent={<Muted>لا توجد منتجات بعد.</Muted>} renderItem={({item}) => <MenuRow item={item} onToggle={() => toggle(item)} onPrice={async(value) => { item.__price=value; await changePrice(item); }} />} />
  </>;
}

function MenuRow({ item, onToggle, onPrice }: { item:any; onToggle:()=>void; onPrice:(value:string)=>void|Promise<void> }) {
  const [price,setPrice] = useState(String(item.price));
  return <Card>
    <Text style={{ fontWeight:'900', textAlign:'right' }}>{item.name}</Text>
    <Muted>{item.category} • {item.is_available ? 'متاح' : 'موقوف'}</Muted>
    <Field keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
    <Button title="حفظ السعر" onPress={() => void onPrice(price)} />
    <Button title={item.is_available ? 'إيقاف المنتج' : 'إتاحة المنتج'} onPress={onToggle} />
  </Card>;
}

function InventorySection({ storeId, rows, refresh }: { storeId:string; rows:any[]; refresh:()=>Promise<unknown> }) {
  const [name,setName]=useState(''); const [unit,setUnit]=useState('وحدة'); const [quantity,setQuantity]=useState('0'); const [busy,setBusy]=useState(false);
  const lowCount = useMemo(() => rows.filter((x) => Number(x.quantity) <= Number(x.low_stock_threshold)).length,[rows]);
  async function create() {
    setBusy(true);
    try { await addInventoryItem({ storeId, name, unit, quantity:Number(quantity) }); setName(''); setQuantity('0'); await refresh(); }
    catch(e) { Alert.alert('تعذر إضافة الصنف', e instanceof Error ? e.message : 'حاول مرة أخرى'); }
    finally { setBusy(false); }
  }
  return <>
    <Title>المخزون</Title><Muted>{lowCount ? `${lowCount} صنف وصل لحد التنبيه أو أقل` : 'مستويات المخزون طبيعية.'}</Muted>
    <Card><Field placeholder="اسم الصنف" value={name} onChangeText={setName}/><Field placeholder="الوحدة" value={unit} onChangeText={setUnit}/><Field placeholder="الكمية الافتتاحية" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity}/><Button title={busy?'جاري الإضافة…':'إضافة صنف'} disabled={busy} onPress={create}/></Card>
    {rows.map((item) => <InventoryRow key={item.id} item={item} refresh={refresh} />)}
  </>;
}

function InventoryRow({ item, refresh }: { item:any; refresh:()=>Promise<unknown> }) {
  const [delta,setDelta]=useState('');
  async function apply() { try { await adjustInventory(item.id,Number(delta),'merchant_manual_adjustment'); setDelta(''); await refresh(); } catch(e) { Alert.alert('تعذر تعديل المخزون', e instanceof Error ? e.message : 'حاول مرة أخرى'); } }
  const low = Number(item.quantity) <= Number(item.low_stock_threshold);
  return <Card><Text style={{ fontWeight:'900', textAlign:'right' }}>{item.name}</Text><Muted>{Number(item.quantity).toFixed(2)} {item.unit}{low?' • مخزون منخفض':''}</Muted><Field placeholder="+ إضافة / - خصم" keyboardType="numbers-and-punctuation" value={delta} onChangeText={setDelta}/><Button title="تسجيل الحركة" onPress={apply}/></Card>;
}
