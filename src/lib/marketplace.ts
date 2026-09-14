import { supabase } from './supabase';
import { getStores } from './api';
import type { MenuItem, Store } from '@/src/types/domain';

export const MARKETPLACE_CATEGORIES = [
  ['all','الكل','🛍️'],['food','مطاعم وأكل','🍔'],['grocery','بقالة وسوبر ماركت','🛒'],['pharmacy','صيدليات وصحة','💊'],
  ['bakery','مخبوزات وحلويات','🥐'],['coffee','قهوة ومشروبات','☕'],['fruits','خضار وفاكهة','🥬'],['meat','لحوم ودواجن وأسماك','🥩'],
  ['fashion','ملابس وأحذية','👕'],['beauty','عناية وتجميل وعطور','💄'],['electronics','إلكترونيات وموبايلات','📱'],['home','منزل وأدوات','🏠'],
  ['cleaning','تنظيف ومنظفات','🧴'],['gifts','هدايا وورد','🎁'],['books','كتب ومكتبات','📚'],['pets','حيوانات أليفة','🐾'],
  ['auto','سيارات وقطع غيار','🚗'],['hardware','عدد وأدوات وصيانة','🛠️'],['services','خدمات محلية','🧰'],['other','أخرى','✨'],
] as const;

const aliases:Record<string,string[]>={
  food:['مطعم','مطاعم','اكل','أكل','وجبه','وجبة','برجر','بيتزا','كشري','سندوتش'],
  grocery:['سوبر','سوبر ماركت','بقاله','بقالة','ماركت','تموين','مياه','مشروبات'],
  pharmacy:['صيدليه','صيدلية','دواء','ادويه','أدوية','صحه','صحة','فيتامين'],
  bakery:['حلويات','مخبوزات','عيش','كيك','تورتة','مخبز'],coffee:['قهوه','قهوة','كافيه','مشروب','عصير'],
  fruits:['خضار','فاكهه','فاكهة','فواكه'],meat:['لحوم','فراخ','دواجن','سمك','اسماك','أسماك'],
  fashion:['ملابس','هدوم','احذيه','أحذية','شنط','موضة'],beauty:['عطور','برفان','مكياج','تجميل','عنايه','عناية'],
  electronics:['موبايل','موبايلات','هاتف','هواتف','الكترونيات','إلكترونيات','شاحن','سماعه','سماعة','كمبيوتر'],
  home:['منزل','ادوات منزليه','أدوات منزلية','مطبخ','اثاث','أثاث'],cleaning:['منظفات','تنظيف','صابون'],
  gifts:['هديه','هدية','هدايا','ورد','زهور'],books:['كتاب','كتب','مكتبه','مكتبة','ادوات مكتبيه','أدوات مكتبية'],
  pets:['حيوانات','قطط','كلاب','اكل حيوانات','أكل حيوانات'],auto:['سيارات','عربيات','قطع غيار','زيوت','كاوتش'],
  hardware:['عدد','ادوات','أدوات','صيانة','سباكة','كهرباء'],services:['خدمات','فني','سباك','كهربائي','صيانة منزلية'],
};

export function normalizeArabic(value:string){return value.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}

export function inferMarketplaceCategory(value:string){
  const q=normalizeArabic(value);
  for(const [key,terms] of Object.entries(aliases)) if(terms.some(term=>q.includes(normalizeArabic(term)))) return key;
  return 'other';
}

export type MarketplaceItem=MenuItem&{store_name:string;store_category:string|null;store_rating:number;delivery_fee:number};
export type MarketplaceSearchResult={stores:Store[];items:MarketplaceItem[]};

export async function getMarketplaceCatalog():Promise<MarketplaceSearchResult>{
  const stores=await getStores();
  const ids=stores.map(s=>s.id);
  if(!ids.length)return{stores,items:[]};
  const {data,error}=await supabase.from('menu_items').select('id,store_id,name,description,image_url,price,category,is_available').in('store_id',ids).eq('is_available',true).limit(750);
  if(error)throw error;
  const byStore=new Map(stores.map(s=>[s.id,s]));
  const items=(data??[]).map(row=>{const store=byStore.get(row.store_id);return{...row,price:Number(row.price),store_name:store?.name??'',store_category:store?.category??null,store_rating:Number(store?.rating??0),delivery_fee:Number(store?.delivery_fee??0)} as MarketplaceItem;});
  return{stores,items};
}

export function searchMarketplace(catalog:MarketplaceSearchResult,query:string,category='all',maxPrice?:number|null){
  const q=normalizeArabic(query);
  const selected=category==='all'?null:category;
  const storeMatches=catalog.stores.filter(store=>{
    const inferred=inferMarketplaceCategory(`${store.category??''} ${store.name} ${store.description??''}`);
    if(selected&&inferred!==selected)return false;
    if(!q)return true;
    return normalizeArabic(`${store.name} ${store.category??''} ${store.description??''}`).includes(q);
  });
  const itemMatches=catalog.items.filter(item=>{
    const inferred=inferMarketplaceCategory(`${item.category??''} ${item.store_category??''} ${item.name} ${item.description??''}`);
    if(selected&&inferred!==selected)return false;
    if(maxPrice!=null&&item.price>maxPrice)return false;
    if(!q)return true;
    return normalizeArabic(`${item.name} ${item.description??''} ${item.category??''} ${item.store_name} ${item.store_category??''}`).includes(q);
  });
  return{stores:storeMatches.slice(0,30),items:itemMatches.sort((a,b)=>b.store_rating-a.store_rating||a.price-b.price).slice(0,60)};
}
