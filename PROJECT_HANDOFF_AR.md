# ملف متابعة مشروع طلباتك دليفري

> **هذا الملف هو مصدر الحقيقة للاستكمال في أي محادثة جديدة.** قبل تعديل أي شيء: اقرأ هذا الملف، راجع آخر `main` وآخر CI/Android runs، ولا تعتمد على الذاكرة وحدها. بعد كل دفعة تعديلات مهمة حدّث هذا الملف.

## 1) المشروع الصحيح
- المستودع الوحيد المسموح تعديله: `abdallah5555/Talabatk-delivery`.
- **ممنوع تعديل** المستودع القديم `abdallah5555/Talbak-delivery`.
- الفرع الأساسي: `main`.
- React Native + Expo SDK 57 + TypeScript + Expo Router.
- Android: APK مباشر للتثبيت.
- iPhone/iPad: PWA عبر Safari.
- Backend: Supabase.
- Vercel لاحقًا للمشروع الجديد فقط؛ لا تلمس مشروع Vercel القديم.

## 2) Supabase
- Project ref: `vriwhtuxagnbfxybjviz`.
- URL: `https://vriwhtuxagnbfxybjviz.supabase.co`.
- Region: `eu-central-1`، والحالة Healthy.
- لا تضع Service Role أو أي Secret في المستودع العام.
- DDL عبر migrations / `apply_migration`، والبيانات/الفحص عبر `execute_sql`.
- `SECURITY DEFINER` يجب أن يستخدم `search_path` آمن وschema-qualified names.

## 3) قاعدة الأدوار والتفعيل — لا يجوز كسرها
الأدوار: `customer / merchant / driver / admin`.
- العميل يتفعل مباشرة بعد التسجيل.
- التاجر **لا يحصل على `merchant`** إلا بعد موافقة الإدارة.
- المندوب **لا يحصل على `driver`** إلا بعد موافقة الإدارة.
- Pending merchant/driver ممنوع من لوحة التشغيل حتى لو فتح الرابط يدويًا.
- Approved merchant → `/role/merchant`.
- Approved driver → `/role/driver`.
- Admin → `/admin` ولا يذهب لواجهة العميل.
- Pending → `/pending-approval`.
- تسجيل التاجر/المندوب غير المكتمل → `/onboarding`.
- توجد regression tests لقواعد التوجيه.

## 4) التسجيل والدخول
- التسجيل: عميل / تاجر / مندوب.
- Phone + Password، بدون SMS OTP.
- يوجد **تأكيد كلمة المرور** في التسجيل.
- يوجد **إظهار/إخفاء كلمة المرور** في الدخول والتسجيل.
- تم إخفاء عنوان Route الافتراضي `index`.
- نجاح تسجيل الدخول منفصل عن تحميل الصلاحيات؛ فشل role lookup لا يظهر كأن الباسورد غلط.
- شاشة خطأ التوجيه فيها Retry + تسجيل الدخول بحساب آخر.
- Approved roles لها أولوية قبل فحص Pending، فلا يتعطل الأدمن/التاجر/المندوب المعتمد بسبب استعلام Pending.

## 5) Onboarding التاجر
- اسم النشاط، التصنيف، العنوان، اللوجو/صورة المتجر، GPS.
- بعد الإرسال: Pending.
- موافقة الأدمن فقط تمنح `merchant` وتجهز المتجر.
- المتجر الجديد يبدأ `is_open=false` حتى يجهزه التاجر ويفتحه بنفسه.
- `public-media` للصور العامة، و`onboarding-documents` للمستندات الخاصة.

## 6) Onboarding المندوب
- الاسم/الهاتف من الحساب، صورة شخصية، Motorcycle أو Bicycle.
- Motorcycle: النوع/الموديل + رخصة قيادة أمام/خلف + رخصة المركبة أمام/خلف.
- Bicycle لا يطلب مستندات الدراجة النارية.
- المستندات الخاصة في bucket خاص.
- الصورة الشخصية تصبح Avatar بعد الموافقة.
- Pending حتى موافقة الأدمن فقط.

## 7) لوحة الإدارة
تم تحويلها إلى Control Center منفصلة عن واجهة العميل، وتشمل:
- KPIs ومراجعة طلبات التاجر/المندوب.
- عرض بيانات النشاط والموقع واللوجو.
- عرض مستندات المندوب عبر Signed URLs.
- Approve/Reject.
- الاشتراكات والكاشير وعمولة المندوب.
- التحكم بخدمات المتاجر والإعلانات والبنية الأساسية.

## 8) الاشتراكات/الكاشير/العمولة
الجداول: `platform_commercial_settings`, `store_service_access`.
الحالة الحالية:
- Merchant subscription required = false.
- Merchant default price = 0.
- Cashier subscription required = false.
- Cashier default price = 0.
- Driver platform commission = 0%.
- المندوب يحصل حاليًا على 100%.
- النظام جاهز لتغيير القيم لاحقًا من الإدارة بدون تغيير تاريخ أرباح الطلبات القديمة.

## 9) الإعلانات
- جداول `ad_slots`, `ad_campaigns`.
- Slots: Home Top / Home Inline / Store Bottom، افتراضيًا Disabled.
- لا Ads داخل Checkout / Order Tracking / Adhkar.
- `react-native-google-mobile-ads` موجود.
- Android AdMob App ID مضبوط في المشروع.
- ما زالت Banner Ad Unit IDs الحقيقية غير مستلمة.
- قبل Live Ads: Test Ads/Test Devices + privacy/consent.

## 10) الأذكار
- صباح/مساء Offline.
- عدادات محلية.
- إشعارات محلية اختيارية.
- بدون إعلانات في الصفحة.

## 11) إعادة التصميم المنفذة
تمت إعادة تصميم: Login, Signup, Home, Account, Store, Checkout, Orders, Order Tracking, Merchant Dashboard, Driver Dashboard, Admin Dashboard, Applications, Onboarding, Pending Approval.

## 12) Expo OTA
تمت إضافة `expo-updates` وتجهيز OTA.
- Expo Project ID: `1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `runtimeVersion.policy = appVersion`.
- `updates.url = https://u.expo.dev/1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `checkAutomatically = ON_LOAD`.
- `fallbackToCacheTimeout = 0`.
- `OtaUpdateBanner` يفحص التحديث وينزله ويعيد تحميل التطبيق.
- Workflow: `.github/workflows/ota-production.yml`.
- يحتاج `EXPO_TOKEN` كـGitHub Secret؛ لا يوضع في الكود.
- JS/UI/assets يمكن تحديثها OTA مع نفس runtime. Native changes تحتاج APK جديدة.

## 13) اللوجو والهوية — آخر حالة 2026-09-10
- المستخدم اختار **اللوجو الثاني والأخير**: شنطة توصيل برتقالية + location pin، وأسفلها `Talabatk Delivery`.
- هذا الاختيار يلغي اللوجو الأول.
- لأيقونة التطبيق/PWA تم استخراج رمز الشنطة/location pin نفسه وتحويله إلى نسخة Flat Orange/White صغيرة ومقروءة.
- `assets/app-icon.png` تم استبداله بPNG صغير ومتحقق منه.
- `public/icons/icon-192.png` و`icon-512.png` تم استبدالهما بملفات سليمة من نفس الرمز.
- مشكلة PNG القديمة مرت بمرحلتين: `CRC error` ثم MIME/filter corruption بسبب نقل ملفات binary كبيرة. تم حل السبب باستخدام PNG مسطحة صغيرة.
- **CI run 236 على commit `babc3ab9ece34cf56a2da979dfc33c1f7ae932b3` نجح بالكامل**، بما فيه Web Export وPlaywright؛ إذًا مشكلة Jimp/PNG مغلقة.
- تم إنشاء `assets/adaptive-icon.png` شفاف من نفس الرمز وربطه في `app.json` مع Android Adaptive Icon على commit `4675034ffdd4136555e8a3bdffabcfde36e4a668`.

## 14) Splash وشاشة التحميل
- `index` مخفي من Stack.
- AppGate يعرض شاشة تحميل branded باسم `طلباتك دليفري` وعبارة `كل اللي محتاجه أقرب ليك` مع مؤشر تحميل.
- Native splash حاليًا يستخدم `assets/app-icon.png` على خلفية فاتحة، ثم ينتقل لشاشة التحميل branded داخل React.
- الهدف: لا شاشة بيضاء صامتة أثناء فتح التطبيق.

## 15) الاختبارات
Pipeline الحالي: Expo Doctor → ESLint → TypeScript → Vitest → Expo Web Export → Playwright E2E، مع Android Release workflow منفصل.
آخر نتيجة مؤكدة قبل Adaptive Icon:
- Doctor ✅
- Lint ✅ (يوجد warning قديم غير مانع في `app/order/[id].tsx` عن eslint-disable غير مستخدم)
- TypeScript ✅
- Unit Tests: 12/12 ✅
- Web Export ✅
- Playwright ✅

لا تدّعي Production-Ready قبل إكمال authenticated E2E للأدوار والـOTA الحقيقي.

## 16) أشياء ممنوعة حاليًا
- Minimum Order enforcement.
- Proof of Delivery PIN.
- Payment Gateway.
- SMS OTP.
- Google Maps API مدفوع.
- Coupon discounts at checkout.

## 17) خريطة Production Hardening
الخطة تشمل: Security audit، Supabase Auth، password/PIN security، trusted devices، RBAC/RLS، DB source of truth، orders totals/states/atomic driver acceptance/capacity، commission، GPS/OSM+MapLibre، payments الحالية، complaints/audit، backup بدون أسرار، إزالة mock data، merchant/driver applications، ratings/notifications، PWA/service worker/dark mode، mobile UI/accessibility/network handling، lint/build/security/env/admin settings، ثم final production check.

## 18) المتبقي المعروف — حسب الأولوية
1. انتظار CI + Android build على commit Adaptive Icon الحالي.
2. استخراج **APK انتقالية جديدة** تحتوي expo-updates + الهوية الجديدة + إصلاحات الدخول.
3. تثبيت/تأكيد Android signing ثابت قبل التوزيع الواسع حتى تُثبت الإصدارات الجديدة فوق القديمة بدون حذف التطبيق.
4. إضافة `EXPO_TOKEN` كـGitHub Secret وتشغيل أول OTA Production حقيقي.
5. اختبار APK الانتقالية تستقبل OTA داخل نفس التطبيق.
6. Authenticated E2E: customer signup/login/order؛ merchant signup→onboarding→pending→approve→dashboard؛ driver documents→pending→approve→online→accept→delivered؛ admin reject/approve.
7. تحسين Merchant management/report وDriver operations وAdmin operations بصريًا.
8. تحسين اختيار الموقع بخريطة + camera capture للمستندات والصور.
9. عرض صورة/بيانات المندوب للعميل أثناء التتبع.
10. Network/offline UI وتدقيق PWA النهائي.
11. Store hours UI، CSV reports، nearby-order distance، background driver location، وباقي final hardening.
12. الإعلانات الحقيقية بعد استلام Ad Unit IDs وإكمال consent/privacy.

## 19) قاعدة الاستكمال في أي شات جديد
إذا قال المستخدم: **`كمل مشروع طلباتك دليفري من آخر حاجة وصلنا لها`** أو **`كمل التطبيق من آخر نقطة`**:
1. اقرأ `PROJECT_HANDOFF_AR.md` أولًا.
2. راجع `main` وآخر CI/Android runs.
3. لا تلمس المستودع القديم.
4. لا تفترض أن خطوة انتهت إلا لو الكود/DB/CI يثبت ذلك.
5. ابدأ من قسم `المتبقي المعروف`.
6. حدّث هذا الملف بعد كل دفعة شغل مهمة وقبل إنهاء جلسة عمل كبيرة.
