import { inferMarketplaceCategory, normalizeArabic } from './marketplace';

export type AssistantAction=
  |{type:'route';label:string;href:string}
  |{type:'search';label:string;query:string;category?:string;maxPrice?:number|null}
  |{type:'none'};

export type AssistantReply={text:string;action?:AssistantAction;intent:string};
export type AssistantContext={latestOrderId?:string|null;latestOrderStatus?:string|null;hasActiveOrder?:boolean};

const includesAny=(q:string,terms:string[])=>terms.some(t=>q.includes(normalizeArabic(t)));
const statusLabels:Record<string,string>={pending:'بانتظار تأكيد التاجر',accepted:'تم قبول الطلب',preparing:'جاري التحضير',ready:'جاهز للاستلام',assigned:'تم تعيين مندوب',picked_up:'المندوب استلم الطلب',on_the_way:'المندوب في الطريق',delivered:'تم التسليم',cancelled:'تم إلغاء الطلب',rejected:'تم رفض الطلب'};

function parseMaxPrice(raw:string){
  const m=raw.match(/(?:تحت|اقل من|أقل من|حد اقصي|حد أقصى|بحدود|في حدود)\s*(\d{1,6})/);
  return m?Number(m[1]):null;
}

function searchReply(raw:string,q:string):AssistantReply{
  const maxPrice=parseMaxPrice(raw);
  const category=inferMarketplaceCategory(raw);
  const cleaned=raw.replace(/عايز|عاوزه|محتاج|هاتلي|هات|دورلي|دور|ابحثلي|ابحث|فين|ممكن|لو سمحت/gi,' ').replace(/\s+/g,' ').trim();
  return{text:`تمام، هدورلك في كل طلباتك — مطاعم، صيدليات، بقالة، موبايلات، ملابس، هدايا وخدمات — وأطلعلك أقرب نتائج مطابقة${maxPrice?` تحت ${maxPrice} جنيه`:''}.`,intent:'marketplace_search',action:{type:'search',label:'عرض النتائج',query:cleaned||q,category:category==='other'?undefined:category,maxPrice}};
}

export function buildAssistantReply(raw:string,ctx:AssistantContext={}):AssistantReply{
  const q=normalizeArabic(raw);
  if(!q)return{text:'اكتبلي اللي محتاجه بطريقتك، وأنا هساعدك.',intent:'empty',action:{type:'none'}};

  if(includesAny(q,['السلام عليكم','سلام','اهلا','أهلا','هاي','صباح الخير','مساء الخير']))return{text:'أهلاً بيك 👋 أنا مساعد طلباتك. أقدر أدورلك على أي منتج أو خدمة، أقولك حالة طلبك، أفتح الدعم، العناوين، المفضلة أو إعدادات حسابك.',intent:'greeting'};
  if(includesAny(q,['تقدر تعمل ايه','بتعمل ايه','ساعدني','مساعده','مساعدة','الاوامر','الأوامر']))return{text:'ممكن تقول مثلاً: «عايز برجر تحت 200»، «فين طلبي؟»، «عايز صيدلية»، «غير عنواني»، «افتح المفضلة»، «الطلب ناقص»، «عايز أغير كلمة السر»، أو «عايز أقدم كتاجر».',intent:'help'};

  if(includesAny(q,['فين طلبي','طلبي فين','حاله الطلب','حالة الطلب','وصل لفين','الطلب وصل فين','متابعه الطلب','متابعة الطلب'])){
    if(!ctx.latestOrderId)return{text:'مفيش طلب حديث ظاهر عندي دلوقتي. افتح سجل الطلبات لو عايز تراجع الطلبات القديمة.',intent:'order_status',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};
    const label=statusLabels[ctx.latestOrderStatus??'']??'حالته اتحدثت';
    return{text:`آخر طلب عندك: ${label}. تقدر تفتح التفاصيل والتتبع المباشر من هنا.`,intent:'order_status',action:{type:'route',label:'فتح الطلب',href:`/order/${ctx.latestOrderId}`}};
  }
  if(includesAny(q,['المندوب فين','مكان المندوب','اتتبع المندوب','تتبع المندوب']))return{text:'لو الطلب اتسند لمندوب هتلاقي موقعه المباشر داخل صفحة الطلب.',intent:'driver_tracking',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};
  if(includesAny(q,['الغاء الطلب','إلغاء الطلب','الغي الطلب','ألغي الطلب']))return{text:'الإلغاء متاح حسب مرحلة الطلب. افتح الطلب واضغط «إلغاء الطلب» لو الحالة لسه تسمح.',intent:'cancel_order',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};
  if(includesAny(q,['اطلب تاني','اعاده الطلب','إعادة الطلب','نفس الطلب','آخر طلب']))return{text:'تقدر تعيد أي طلب تم تسليمه من صفحة تفاصيله، والسلة هتتجهز بالمنتجات المتاحة حاليًا.',intent:'reorder',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};
  if(includesAny(q,['امتي يوصل','إمتى يوصل','ميعاد الوصول','وقت الوصول','هيوصل امتى','هيوصل إمتى']))return{text:'وقت الوصول بيتغير حسب تجهيز التاجر وحالة المندوب. افتح الطلب وهتشوف آخر حالة وتحديثات التتبع.',intent:'eta',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};

  if(includesAny(q,['الطلب ناقص','حاجه ناقصه','حاجة ناقصة','منتج ناقص']))return{text:'هساعدك تسجل المشكلة بسرعة. اختار الطلب واكتب المنتج الناقص، والإدارة هتتابع الشكوى من نفس الحساب.',intent:'missing_item',action:{type:'route',label:'فتح الدعم والشكاوى',href:'/support'}};
  if(includesAny(q,['طلب غلط','الطلب غلط','منتج غلط','جالي حاجه غلط','جالي حاجة غلط']))return{text:'سجل مشكلة «منتج/طلب غير صحيح» مع رقم الطلب والتفاصيل، علشان تتراجع بسرعة.',intent:'wrong_item',action:{type:'route',label:'فتح الدعم والشكاوى',href:'/support'}};
  if(includesAny(q,['تالف','بايظ','مكسور','مشكله في المنتج','مشكلة في المنتج']))return{text:'لو المنتج تالف أو مكسور، افتح الدعم واكتب رقم الطلب ووصف واضح للمشكلة.',intent:'damaged_item',action:{type:'route',label:'فتح الدعم والشكاوى',href:'/support'}};
  if(includesAny(q,['متاخر','متأخر','الطلب اتاخر','الطلب اتأخر']))return{text:'لو الطلب متأخر، راجع التتبع الأول. لو التأخير غير طبيعي افتح شكوى من الدعم.',intent:'late_order',action:{type:'route',label:'فتح طلباتي',href:'/orders'}};
  if(includesAny(q,['اكلم الدعم','أكلم الدعم','خدمه العملاء','خدمة العملاء','شكوي','شكوى','مشكله','مشكلة']))return{text:'افتح الدعم والشكاوى واكتب المشكلة بالتفصيل. كل شكوى بتفضل محفوظة في حسابك وحالتها بتتحدث.',intent:'support',action:{type:'route',label:'فتح الدعم',href:'/support'}};
  if(includesAny(q,['اكلم المندوب','أكلم المندوب','شات المندوب','رساله للمندوب','رسالة للمندوب']))return{text:'ميزة الشات المباشر مع المندوب ضمن المرحلة الجاية. حاليًا تقدر تتابع المندوب من صفحة الطلب وتكتب تعليمات التوصيل في ملفك الشخصي.',intent:'driver_chat'};

  if(includesAny(q,['العنوان','عنواني','غير موقعي','غيّر موقعي','اضيف عنوان','أضيف عنوان','مكاني']))return{text:'تقدر تضيف أكتر من عنوان وتحدد موقعه على الخريطة وتختار عنوان افتراضي.',intent:'addresses',action:{type:'route',label:'فتح عناويني',href:'/addresses'}};
  if(includesAny(q,['المفضله','المفضلة','المفضلات','اماكني المحفوظه','أماكني المحفوظة']))return{text:'دي قائمة الأماكن اللي حفظتها علشان ترجع لها بسرعة.',intent:'favorites',action:{type:'route',label:'فتح المفضلة',href:'/favorites'}};
  if(includesAny(q,['صورتي','الصوره الشخصيه','الصورة الشخصية','اسمي','بياناتي','ملفي الشخصي','تعليمات التوصيل']))return{text:'من ملفك الشخصي تقدر تعدل الصورة والاسم وتعليمات التوصيل وطريقة التواصل المفضلة.',intent:'profile',action:{type:'route',label:'فتح ملفي الشخصي',href:'/profile'}};
  if(includesAny(q,['كلمه السر','كلمة السر','الباسورد','الامان','الأمان']))return{text:'تقدر تغير كلمة المرور من صفحة الأمان بعد التحقق من كلمة المرور الحالية.',intent:'security',action:{type:'route',label:'فتح الأمان',href:'/security'}};
  if(includesAny(q,['اشعارات','إشعارات','التنبيهات','اخر التنبيهات','آخر التنبيهات']))return{text:'هنا هتلاقي تحديثات الطلبات والتنبيهات المرتبطة بحسابك.',intent:'notifications',action:{type:'route',label:'فتح الإشعارات',href:'/notifications'}};
  if(includesAny(q,['اذكار','أذكار','التذكير','ذكر']))return{text:'تقدر تختار قسم الأذكار وتفعّل تذكير كل دقيقة لحد 15 دقيقة.',intent:'adhkar',action:{type:'route',label:'فتح الأذكار',href:'/adhkar'}};

  if(includesAny(q,['ادفع ازاي','أدفع إزاي','الدفع','كاش','مدفوع للتاجر']))return{text:'حاليًا الدفع في طلباتك إما كاش عند الاستلام أو تسجيل إنك دفعت مباشرة للتاجر. مفيش بوابة دفع داخل التطبيق دلوقتي.',intent:'payment'};
  if(includesAny(q,['طلب مجدول','جدول الطلب','بعد ساعه','بعد ساعة','بعد ساعتين']))return{text:'من شاشة تأكيد الطلب تقدر تختار التنفيذ في أقرب وقت أو بعد ساعة أو ساعتين.',intent:'scheduled_order'};
  if(includesAny(q,['تاجر','افتح متجر','أفتح متجر','سجل كتاجر','انضم كتاجر']))return{text:'تقدر تقدم كتاجر من داخل التطبيق. هنطلب بيانات النشاط والمستندات وبعدها الإدارة تراجع الطلب.',intent:'merchant_onboarding',action:{type:'route',label:'الانضمام كتاجر',href:'/applications'}};
  if(includesAny(q,['مندوب','اشتغل مندوب','سجل كمندوب','انضم كمندوب','سواق']))return{text:'تقدر تقدم كمندوب من داخل التطبيق، وبعد رفع البيانات والمستندات الإدارة تراجع طلبك قبل التفعيل.',intent:'driver_onboarding',action:{type:'route',label:'الانضمام كمندوب',href:'/applications'}};

  if(includesAny(q,['خصم','كوبون','عروض','عرض']))return{text:'العروض والكوبونات هتظهر لما تكون مفعّلة من الإدارة. حاليًا مش هطبّق خصم غير موجود فعليًا.',intent:'offers'};
  if(includesAny(q,['نقاط','مكافآت','مكافات','ولاء']))return{text:'برنامج النقاط والمكافآت ضمن التطوير الجاي، وهيكون مربوط بالطلبات الفعلية مش أرقام وهمية.',intent:'loyalty'};
  if(includesAny(q,['دعوه','دعوة','احاله','إحالة','صاحبي','صديقي']))return{text:'ميزة دعوة الأصدقاء والمكافآت بالإحالة ضمن الخطة الجاية بعد تثبيت نظام النقاط.',intent:'referral'};

  if(includesAny(q,['اقسام','أقسام','بتوصلوا ايه','بتوصلوا إيه','عندكم ايه','عندكم إيه','كل حاجه','كل حاجة']))return{text:'طلباتك مش للأكل بس: مطاعم، بقالة، صيدليات، حلويات، خضار وفاكهة، ملابس، موبايلات وإلكترونيات، عطور وتجميل، منزل، هدايا وورد، كتب، حيوانات أليفة، سيارات وقطع غيار، أدوات وصيانة وخدمات محلية.',intent:'categories',action:{type:'route',label:'استكشف كل الأقسام',href:'/search'}};

  if(includesAny(q,['عايز','عاوزه','محتاج','هات','دور','ابحث','اشتري','اشترى','فين'])||inferMarketplaceCategory(raw)!=='other')return searchReply(raw,q);

  return{text:'فهمت إنك محتاج مساعدة، بس محتاج أعرف أكتر. ممكن تكتب اسم المنتج أو الخدمة، أو تقول «فين طلبي؟»، «عايز أغير العنوان»، «الطلب ناقص»، أو «افتح الدعم».',intent:'fallback'};
}

export const ASSISTANT_QUICK_PROMPTS=['عايز حاجة أطلبها','فين طلبي؟','عايز صيدلية','عايز موبايل أو شاحن','الطلب ناقص','غير عنواني','افتح المفضلة','عايز أقدم كتاجر'];
