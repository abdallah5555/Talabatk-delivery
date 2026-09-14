# ملف متابعة مشروع طلباتك دليفري — مصدر الحقيقة للاستكمال في أي شات

> **اقرأ هذا الملف كاملًا قبل أي تعديل.** الهدف منه أن أي شات جديد يقدر يكمل كأنه نفس المحادثة. بعد قراءته: راجع آخر `main`، آخر CI، آخر Android/OTA runs، وحالة Supabase الحية. الكود وقاعدة البيانات وCI الحيّة لهم الأولوية على أي وصف قديم.

## 0) قواعد ثابتة لا تتغير
- المستودع الوحيد المسموح تعديله: `abdallah5555/Talabatk-delivery`.
- **ممنوع تمامًا** تعديل المستودع القديم `abdallah5555/Talbak-delivery`.
- الفرع الأساسي: `main`.
- أي إصلاح أو ميزة جديدة لازم تعدي Regression Guard وCI قبل اعتبارها جاهزة.
- المستخدم حساس جدًا من فكرة «نصلح حاجة ونبوظ حاجة تانية»؛ لا يتم التوسع قبل تثبيت الحالي واختباره.
- جميع الخدمات مجانية قدر الإمكان.
- Android = APK مباشر، iPhone/iPad = PWA/Web من نفس المشروع.
- React Native + Expo SDK 57 + TypeScript + Expo Router + Supabase + TanStack Query + MapLibre/OSM.
- عربي/RTL.
- لا Google Maps API مدفوع، لا SMS OTP، لا Payment Gateway حاليًا.

## 1) Supabase الحي
- Project ref: `vriwhtuxagnbfxybjviz`.
- URL: `https://vriwhtuxagnbfxybjviz.supabase.co`.
- Region: `eu-north-1`.
- الـpublic anon/publishable key موجود في إعدادات المشروع فقط؛ **ممنوع نشر Service Role أو أي Secret**.
- DDL عبر migrations.
- SECURITY DEFINER: `search_path=''` + schema-qualified + grants ضيقة.
- RLS/BOLA/IDOR إلزامي.
- ممنوع الاعتماد على `user_metadata` في التفويض.

## 2) الأدوار والتوجيه
الأدوار: `customer`, `merchant`, `driver`, `admin`.
- customer يتفعل فورًا.
- merchant/driver يحتاجان موافقة الأدمن.
- merchant المعتمد → `/role/merchant`.
- driver المعتمد → `/role/driver`.
- admin → `/admin`.
- pending → `/pending-approval`.
- onboarding غير مكتمل → `/onboarding`.
- Multi-role مدعوم.
- صلاحيات الدور Server-authoritative.

## 3) Auth والجلسة
- Phone + Password، بدون SMS OTP.
- Session persist عبر Supabase.
- Native storage عبر SecureStore.
- Interactive-login window = 72 ساعة.
- key: `talabatk_last_interactive_auth_at`.
- لا تخزن كلمة المرور.
- مسح رقم الهاتف من login يمسح كلمة المرور من الحقل.
- الحساب الموقوف يتم رفضه وتسجيل الخروج محليًا.

## 4) الإصدار الحالي وآلية التحديث
- Expo Project ID: `1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- slug المقصود إبقاؤه كما هو بسبب الربط القديم: `talabatk-delicery`.
- Android package: `com.talabatk.delivery`.
- النسخة الحالية في `app.json`: **0.1.8**.
- Android versionCode: **14**.
- runtimeVersion policy = appVersion، إذًا runtime الحالي = **0.1.8**.
- `updates.checkAutomatically = NEVER` عمدًا لتجنب مشاكل أول فتح/black screen السابقة.
- التحديث من داخل التطبيق يتم عبر `OtaUpdateBanner`: تنزيل التحديث فقط ثم يطبق في الفتح الطبيعي التالي؛ لا تستخدم forced `reloadAsync`.
- **التغييرات JS/UI/assets داخل نفس runtime 0.1.8 لا تحتاج APK جديدة؛ تنزل OTA عادي بعد CI الناجح.**
- **أي تغيير Native/permission/plugin/appVersion/runtime يحتاج APK جديدة.**
- آخر APK معروفة للمستخدم: Build 14 / versionCode 14 / app 0.1.8.

## 5) لماذا نظام الحماية موجود
تم تعديل workflows بحيث:
- Android APK التلقائي لا يبني مباشرة مع push؛ ينتظر CI الناجح (`workflow_run`).
- manual APK يشغّل doctor/lint/typecheck/tests/web export قبل البناء.
- production OTA التلقائي ينتظر CI الناجح.
- manual OTA أيضًا يعمل verification قبل النشر.
- يوجد Regression Guard يغطي الصفحات الحرجة، Auth، OTA، الخريطة، Profile، البحث، الشات، التسعير، rewards وغيرها.
- Branch protection الحقيقي على GitHub لم نقدر نفعله من connector لأن صلاحية administration غير متاحة؛ لا تدّعي أنه مفعّل.

## 6) اتجاه المنتج النهائي: Marketplace عام وليس أكل فقط
طلباتك لم يعد Food Delivery فقط. المطلوب Marketplace محلي عام: «اطلب أي حاجة».
الأقسام تشمل مثلًا:
- مطاعم وأكل.
- سوبرماركت.
- صيدليات.
- حلويات.
- خضار وفاكهة.
- لحوم وأسماك.
- ملابس وأحذية.
- تجميل وعطور.
- موبايلات وإلكترونيات.
- منزل ومنظفات.
- هدايا وورد.
- كتب ومكتبات.
- حيوانات أليفة.
- سيارات وقطع غيار.
- عدد وصيانة.
- خدمات محلية.

تم تنفيذ Unified Search يبحث في المتاجر والمنتجات/الأطباق والوصف والقسم والسعر.

## 7) مساعد طلباتك
الهدف: مساعد حقيقي داخل التطبيق وليس شات شكلي.
- مجاني حاليًا بدون API ذكاء اصطناعي مدفوع.
- Intent router + صيغ مصرية + بيانات حقيقية من Supabase.
- يفهم بحث المنتجات/المتاجر، حالة الطلب، إعادة الطلب، الدعم، العناوين، النقاط، الشات، ETA وغيرها.
- لا تعطيه Service Role.
- لا direct SQL من الواجهة.
- أي فعل حساس/تغييري يحتاج تأكيد صريح.
- تم حذف أي كلام تقني يواجه العميل مثل «بدون AI API مدفوع»؛ الواجهة لازم تتكلم كلغة منتج فقط.
- **مشكلة الكيبورد:** تم تعديل شاشة `/assistant` لاستخدام KeyboardAvoidingView + safe area + scrollToEnd بحيث حقل الكتابة يظل ظاهرًا فوق الكيبورد.

## 8) Order Chat
تم إنشاء شات داخل الطلب Realtime.
- العميل/المندوب/التاجر المرتبط بالطلب/الإدارة فقط يشوفوا الرسائل.
- RLS يمنع غير أطراف الطلب.
- المستخدم العادي لا يعدل/يحذف الرسائل.
- المساعد يقدر يفتح شات آخر طلب عند طلب «عايز أكلم المندوب» ونحوها.

## 9) الأذكار
تم إصلاح عيب كان يجعل إشعارًا واحدًا فقط يتكرر.
النظام الحالي:
- يدور على كل الأذكار بدل «لا إله إلا الله وحده لا شريك له» فقط.
- ينظف إشعارات الأذكار القديمة من الجهاز حتى لو IDs ضاعت من AsyncStorage.
- يستخدم DATE schedules منفصلة بدل repeating generic notification.
- Android exact alarm permission موجود: `android.permission.SCHEDULE_EXACT_ALARM`.
- التجديد يحصل عند فتح/عودة التطبيق.
- آخر تغيير Native الخاص بالأذكار دخل قبل Build 14، لذلك Build 14 يحتوي الصلاحية المطلوبة.

## 10) التسعير الحالي للتوصيل
بعد مراجعة التسعير المرتفع 40 جنيه/3 كم، تم تغيير النموذج ليبدأ من أول كيلومتر.
الإعداد الابتدائي الحالي المرجعي:
- تقريبًا 10 جنيه/كم من أول كم.
- حد أدنى 10 جنيه.
- عنصر وقت بسيط ~0.15 جنيه/دقيقة.
- بدون رسوم فتح طلب إجبارية.
- بدون شريحة 3 كم ثابتة.
- road factor محافظ ~1.10.
- التقريب لأقرب جنيه.
- كل الإعدادات Server-side وقابلة للتعديل من صفحة admin pricing.
- الـcheckout يعرض السعر والمسافة والوقت المتوقع قبل التأكيد.
- snapshot للسعر والمسافة والنموذج يُحفظ على الطلب.
- لو الإحداثيات ناقصة يستخدم fallback آمن بدل اختراع مسافة.

مبدأ مهم: **أجر المندوب مستقل عن الخصم/المكافأة التي حصل عليها العميل**. لو العميل أخذ توصيل مجاني كنقاط، المندوب لا يُعاقب ولا يصبح أجره صفرًا.

## 11) المحاسبة — مناديب / تجار / شركات تشغيل
تم بناء مركز مالي Server-side:
- finance wallets + immutable-ish ledger append model.
- رصيد سالب = مديونية.
- رصيد موجب = رصيد/حق تسوية.
- Debt limits منفصلة للمندوب/التاجر/الشركة.
- enforcement يمكن تشغيله لإيقاف النشاط عند بلوغ حد المديونية.
- العمولات افتراضيًا 0% حاليًا حتى يتم تفعيلها عمدًا.

### المندوب
- driver earnings تحفظ gross delivery fee + platform commission + fleet commission + quality bonus + rating snapshot + net.
- التقييم لا يعمل كعقوبة تلقائية على الأجر.
- نموذج الجودة الحالي عند التفعيل: 4.8+ bonus 10%، 4.6+ bonus 5%، الأقل يأخذ الأجر الأساسي بدون خصم عقابي.
- المتوسط مبني على آخر تقييمات بدل تقييم واحد.

### شركات التشغيل / Fleet
- صاحب شركة الموتوسيكلات **ليس admin عام**.
- له Fleet Manager scoped يرى شركته ومناديبه ومحفظته فقط.
- Admin ينشئ الشركة ويربط owner والمناديب.
- يمكن نسبة شركة من مناديبها، ونسبة منصة من الشركة، ونسبة منصة من مندوب الشركة بشكل مستقل.
- الهدف المستقبلي: المنصة تقدر تحاسب الشركة والمناديب بنسب مستقلة.

## 12) التوصيل المجاني بالنقاط ومحفظة المندوب — الاتفاق الملزم
عند استخدام العميل مكافأة «توصيل مجاني»:
- العميل يدفع 0 رسوم توصيل.
- **المندوب يظل مستحقًا لكامل أجر التوصيل الأصلي.**
- عند التسليم، قيمة `driver_fee_snapshot` تُقيد **موجب** في محفظة المندوب كـ `delivery_reward_credit`.
- لو محفظته سالبة، الموجب يقلل المديونية تلقائيًا.
- لو لا توجد مديونية، يبقى رصيد موجب له ويُستهلك/يُسوّى مقابل التزاماته أو تسوياته المستقبلية.
- بعدها أي عمولات تشغيلية تطبق كحركات مستقلة حسب الإعدادات.
- هذا المنطق تم إضافته في migration: `202609141640_role_rewards_referral_wallet_profile_fixes.sql`.

## 13) Rewards / النقاط — قواعد UX الملزمة
النقاط موجودة للعميل والمندوب والتاجر، لكن **كل Role يرى فقط شرح ومكافآت وسجل دوره**.
- لا يظهر للعميل شرح المندوب/التاجر.
- لا يظهر للمندوب شرح العميل/التاجر.
- لا يظهر للتاجر شرح العميل/المندوب.
- `/rewards?role=customer|driver|merchant`.
- شاشة account تعرض tile نقاط العميل فقط إذا عنده customer.
- واجهة المندوب بها «نقاطي ومكافآتي» خاصة بالمندوب.
- واجهة التاجر بها «نقاطي ومكافآتي» خاصة بالتاجر.
- Catalog API يفلتر حسب role المطلوب.
- Events API يفلتر sources حسب role المطلوب.

## 14) Referral — الاتفاق الملزم
المستخدم رفض أن يكون كود الدعوة شيئًا يدخل بعد التسجيل أو يتبادل بين حسابات قائمة.
النظام المطلوب والمنفذ:
- كود الدعوة يتم إدخاله **أثناء إنشاء الحساب لأول مرة فقط**.
- Edge Function `customer-signup` version 12 تقبل `referralCode` وتسجله للحساب الجديد من السيرفر.
- لا يوجد حقل «عندك كود دعوة؟» داخل صفحة rewards بعد التسجيل.
- الـRPC القديم `claim_referral_code` تم منعه للمستخدمين العاديين.
- Anti-abuse: الحساب الذي حصل على claim كـreferred لا يستخدم نفس مسار referral referrer؛ منع circular/referral swapping قدر الإمكان.
- مكافأة الدعوة الحالية للمستخدم = **50 نقطة ثابتة ظاهرة** بعد أول نشاط مكتمل للمستخدم الجديد.
- لا تكتب للمستخدم «الأدمن هيحدد المكافأة» ولا تعرض له إعدادات الإدارة.
- Admin finance لم يعد يعرض حقل تعديل referral points في الـUI.

## 15) Profile
المستخدم قال إن ملف العميل لم يكن يعمل كما ينبغي، والمطلوب أن تكون أشياء الحساب متجمعة داخل الملف الشخصي.
التحسينات الحالية:
- Profile يستخدم session metadata fallback لو RPC لم يرجع row بسبب profile race/legacy issue.
- error message أصبح أوضح بدل صفحة ميتة.
- Profile يعرض shortcuts للعميل: النقاط والمكافآت / العناوين / المفضلة.
- الصورة + الاسم + الهاتف + تعليمات التوصيل + طريقة التواصل + accessibility notes مستمرة.
- storage bucket: `profile-avatars`.
- RPCs: `get_my_profile_details`, `update_my_profile_details`.
- تم التأكد أن profiles الحالية لا تحتوي أسماء مفقودة في الفحص الأخير.

## 16) Admin
الهدف لوحة Admin احترافية جدًا تتحكم في كل شيء.
الأقسام تشمل:
- dashboard وKPIs.
- applications.
- operations.
- commerce.
- finance.
- pricing.
- fleets.
- wallets/debts.
- loyalty/reward catalog.
- آخر حسابات المناديب.
- commissions/debt limits/rating quality controls.

مهم: لا تظهر للمستخدمين العاديين لغة تقنية أو خيارات Admin أو شروحات عن كيفية تحكم الإدارة.

## 17) المنافسين والاتجاه التنافسي
تمت مراجعة Talabat/Rabbit/elmenus/Mrsool ونماذج Uber/DoorDash في التشغيل.
الدروس التي نعتمدها:
- Marketplace متعدد الفئات، لا أكل فقط.
- search على المنتج/الطبق نفسه، مش المتجر فقط.
- loyalty/rewards.
- direct order chat.
- structured issue center.
- quick reorder.
- personalization من تاريخ المستخدم.
- ETA أفضل.
- fleet/company operations.
- fee transparency.

## 18) الحالة الحالية الدقيقة — 2026-09-14 حوالي 17:48 القاهرة
آخر دفعة شملت:
- إزالة النص التقني من مساعد طلباتك.
- إصلاح keyboard overlap في assistant.
- Role-specific rewards UX.
- Referral code at signup only + fixed 50-point customer-facing promise.
- Wallet credit للمندوب عند free-delivery reward.
- Profile fallbacks + shortcuts.
- إزالة referral-points control من Admin UI.
- migration الحية مطبقة على Supabase.
- `customer-signup` Edge Function تم نشرها version 12.
- regression test جديد: `tests/roleRewardsReferralWalletRegression.test.ts`.

CI run #465 / ID `34856219152` فشل عند TypeScript فقط بعد نجاح doctor وlint.
سبب الفشل كان `app/admin/finance.tsx` في labels الخاصة بالـChip (`string | undefined`).
تم إصلاح السبب في commit:
- `0d75491be48bec81b171257507b2fbdf31982530` — `fix: keep admin finance labels type-safe`.

**بعد هذا الملف سيعمل CI جديد تلقائيًا بسبب آخر commit. لا تعتبر التحديث جاهزًا ولا تنشر OTA قبل أن يصبح آخر CI كامل Green.**

يوجد lint warnings قديمة/غير قاتلة تحتاج تنظيف لاحقًا:
- `app/order-chat/[id].tsx` unused `e`.
- `app/order/[id].tsx` unused eslint-disable.
- `app/privacy.tsx` unused `Pressable`.
- `app/support.tsx` unused `Title`.

## 19) ماذا نفعل فور فتح شات جديد
1. اقرأ هذا الملف أولًا.
2. افحص آخر SHA على `main`.
3. افحص آخر `ci` run وحالته.
4. لو CI فشل: افتح logs وأصلح فقط السبب الحقيقي بدون تغييرات جانبية.
5. لو CI Green: تأكد أن production OTA workflow المرتبط به نجح قبل إخبار المستخدم أن التحديث نزل.
6. لو التغيير JS/UI فقط على runtime 0.1.8: **لا تعمل APK جديدة بلا داعٍ**؛ استخدم OTA.
7. APK جديدة فقط لو هناك Native/appVersion/runtime/plugin/permission change.
8. بعد أي تغييرات كبيرة حدّث هذا الملف بنفس الحالة الجديدة قبل إنهاء العمل.

## 20) أولويات التطوير بعد تثبيت هذه الدفعة
- تأكيد CI/OTA للحزمة الحالية.
- تنظيف lint warnings.
- native Android smoke حقيقي على assistant keyboard/profile/rewards/referral flow.
- استكمال personalization / ETA / structured issues / direct order chat polish.
- مراجعة wallet settlement end-to-end ببيانات اختبار آمنة.
- استكمال Admin الاحترافية بدون كشف إعدادات داخل UX المستخدم.
- توسيع intents لمساعد طلباتك حسب استخدام حقيقي.

## 21) مبدأ الحديث مع المستخدم
- المستخدم يريد تنفيذًا فعليًا، لا مجرد اقتراحات.
- باللهجة المصرية وباختصار نسبي.
- فرّق دائمًا بين: «اتنفذ»، «اتطبق على DB»، «اتنشر OTA»، «اتعمل APK»، «اتجرب Native».
- لا تقل إن حاجة نجحت قبل رؤية CI/Run فعليًا.
- لو مطلوب من المستخدم خطوة، خطوة واحدة في كل مرة.
- لا تغير مشروع آخر ولا legacy Vercel ولا legacy repo.
