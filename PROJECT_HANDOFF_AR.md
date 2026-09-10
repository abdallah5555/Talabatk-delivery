# ملف متابعة مشروع طلباتك دليفري

> هذا الملف هو المرجع الأساسي للاستكمال في أي محادثة جديدة. قبل تعديل أي شيء في المشروع يجب قراءة هذا الملف أولًا، ثم مراجعة آخر حالة فعلية على `main` ونتائج CI. لا تعتمد على الذاكرة وحدها إذا تعارضت مع حالة المستودع.

## 1) المشروع الصحيح
- المستودع الحالي الوحيد المسموح تعديله: `abdallah5555/Talabatk-delivery`.
- لا يتم تعديل المستودع القديم `abdallah5555/Talbak-delivery` نهائيًا.
- الفرع الأساسي: `main`.
- التقنية: React Native + Expo SDK 57 + TypeScript + Expo Router.
- Android: APK مباشر للتثبيت.
- iPhone/iPad: PWA عبر Safari.
- Backend: Supabase.
- الويب: Vercel عند الجاهزية، مع عدم لمس مشروع Vercel القديم المرتبط بالمستودع القديم.

## 2) Supabase الحالي
- Project ref: `vriwhtuxagnbfxybjviz`.
- URL: `https://vriwhtuxagnbfxybjviz.supabase.co`.
- المنطقة: `eu-central-1`.
- المشروع Active/Healthy.
- لا يتم وضع Service Role أو أي Secret داخل المستودع العام.
- كل تغييرات DDL تتم عبر migrations، ويفضل استخدام `apply_migration`.
- Functions التي تستخدم SECURITY DEFINER يجب أن تضبط `search_path` بشكل آمن وتستخدم أسماء schema-qualified.

## 3) الأدوار وقاعدة التفعيل
الأدوار: `customer / merchant / driver / admin`.

قاعدة أساسية لا يجوز كسرها:
- العميل يتفعل مباشرة بعد التسجيل.
- التاجر لا يحصل على صلاحية `merchant` إلا بعد موافقة الإدارة.
- المندوب لا يحصل على صلاحية `driver` إلا بعد موافقة الإدارة.
- Pending merchant/driver لا يدخل لوحة التشغيل حتى لو حاول فتح الرابط يدويًا.
- Approved merchant يدخل `/role/merchant`.
- Approved driver يدخل `/role/driver`.
- Admin يدخل `/admin` ولا يذهب لواجهة الطلب كعميل.
- Pending يذهب إلى `/pending-approval`، وغير المكتمل إلى `/onboarding`.

تم إنشاء اختبارات regression لمنطق التوجيه والاعتماد.

## 4) التسجيل والدخول
- التسجيل يدعم عميل / تاجر / مندوب.
- كل الحسابات تستخدم رقم هاتف + كلمة مرور.
- يوجد تأكيد كلمة المرور في التسجيل.
- تمت إضافة زر إظهار/إخفاء كلمة المرور.
- تم إخفاء Route title الافتراضي `index`.
- تم فصل نجاح تسجيل الدخول عن تحميل الصلاحيات، حتى لا تظهر مشكلة الصلاحيات للمستخدم وكأن كلمة المرور خاطئة.
- عند فشل تحميل الصلاحيات توجد إعادة محاولة وخيار تسجيل الدخول بحساب آخر.
- التوجيه يعتمد أولًا على الأدوار المعتمدة؛ الأدمن/التاجر/المندوب المعتمد لا يجب أن يتعطل بسبب فحص Pending.

## 5) Onboarding التاجر
البيانات الحالية:
- اسم النشاط.
- التصنيف.
- العنوان.
- اللوجو/صورة المتجر.
- الموقع GPS.
- بعد الإرسال تكون الحالة Pending.
- موافقة الأدمن تمنح merchant role وتجهز المتجر.
- المتجر المعتمد يبدأ `is_open=false` حتى يجهزه التاجر ويفتحه بنفسه.

Storage:
- `public-media` للصور العامة.
- `onboarding-documents` للمستندات الخاصة.

## 6) Onboarding المندوب
البيانات الحالية:
- الاسم ورقم الهاتف من الحساب.
- صورة شخصية عامة، وتصبح Avatar بعد الموافقة.
- اختيار وسيلة النقل: Motorcycle أو Bicycle.
- لو Motorcycle: النوع/الموديل + رخصة قيادة أمام/خلف + رخصة المركبة أمام/خلف.
- المستندات الخاصة داخل bucket خاص.
- Bicycle لا يطلب مستندات الدراجة النارية.
- بعد الإرسال Pending حتى موافقة الأدمن.

## 7) لوحة الإدارة
تمت إعادة تصميم لوحة الإدارة لتكون Control Center مستقلة عن واجهة العميل، وتشمل:
- مؤشرات عامة.
- مراجعة طلبات التاجر والمندوب.
- فتح مستندات المندوب بروابط Signed URLs.
- موافقة/رفض الطلبات.
- إعدادات الاشتراكات والكاشير وعمولة المندوب.
- التحكم بخدمات المتجر.
- إعدادات الإعلانات والبنية الأساسية.

## 8) الاشتراكات والعمولات والكاشير
الجداول والإعدادات موجودة:
- `platform_commercial_settings`.
- `store_service_access`.

الحالة الحالية:
- اشتراك التاجر غير مطلوب حاليًا.
- السعر الافتراضي 0.
- اشتراك الكاشير غير مطلوب حاليًا.
- السعر الافتراضي 0.
- عمولة المنصة على المندوب 0% حاليًا، والمندوب يحصل على 100%.
- النظام جاهز لتغيير هذه القيم لاحقًا من الإدارة.

## 9) الإعلانات
موجودة بنية الإعلانات:
- `ad_slots`.
- `ad_campaigns`.
- أماكن افتراضية: Home Top / Home Inline / Store Bottom.
- لا إعلانات داخل Checkout / Order Tracking / Adhkar.
- Google Mobile Ads package موجود.
- قبل الإعلانات الحقيقية يجب استخدام Test Ads/Test Devices وإكمال متطلبات الخصوصية والموافقة.
- ما زالت Ad Unit IDs النهائية المطلوبة من المستخدم غير مستلمة.

## 10) الأذكار
- بيانات صباح/مساء Offline.
- عدادات داخل التطبيق.
- إشعارات محلية اختيارية صباحًا ومساءً.
- لا إعلانات داخل صفحة الأذكار.

## 11) إعادة التصميم المنفذة
تمت إعادة تصميم الصفحات الأساسية بدرجة كبيرة:
- Login.
- Signup.
- Home.
- Account.
- Store.
- Checkout.
- Orders.
- Order tracking.
- Merchant dashboard.
- Driver dashboard.
- Admin dashboard.
- Applications / Onboarding / Pending approval.

## 12) التحديثات OTA
تمت إضافة `expo-updates` وتجهيز OTA.
Expo Project ID الحالي:
`1a617642-b1c4-4a68-8fa5-98c0ad3c7911`

في `app.json`:
- `runtimeVersion` policy = `appVersion`.
- `updates.url = https://u.expo.dev/1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `checkAutomatically = ON_LOAD`.
- `fallbackToCacheTimeout = 0`.

تم تجهيز `OtaUpdateBanner` داخل التطبيق لإظهار تحديث جديد وتنزيله وإعادة تحميل التطبيق.
تم إنشاء workflow يدوي: `.github/workflows/ota-production.yml`.
هذا الـworkflow يحتاج `EXPO_TOKEN` كـGitHub Secret، ولا يجب وضع التوكن في الكود.

مهم: التحديثات JS/UI/assets يمكن أن تكون OTA إذا كانت متوافقة مع نفس runtime. أي تغيير Native يحتاج APK جديدة.

## 13) اللوجو والـSplash
المستخدم اختار آخر صورة أرسلها بتاريخ 2026-09-10 لتكون هي اللوجو الرسمي بدل الصورة السابقة.
التصميم المختار: شعار أسود `talabatk delivery` مع أيقونة صندوق برتقالية فوق حرف `k`.
يجب استخدام هذا الشعار للأيقونة والـSplash والـPWA.

آخر مشكلة CI قبل استبدال الصور:
- Doctor: ناجح.
- Lint: ناجح مع warning واحد قديم في `app/order/[id].tsx`.
- TypeScript: ناجح.
- Unit tests: 12/12 ناجحة.
- Web export: فشل بسبب PNG تالف، والخطأ `CRC error` من Jimp.
- السبب الحالي المطلوب إصلاحه: استبدال ملفات PNG التالفة بأصول سليمة مولدة من اللوجو الأخير المختار.

## 14) شاشة البداية والتحميل
- تم إخفاء `index` من Stack.
- تمت إضافة شاشة تحميل branded داخل التطبيق باسم `طلباتك دليفري` وعبارة `كل اللي محتاجه أقرب ليك` مع مؤشر تحميل.
- ما زال مطلوب ربط native Splash فعلي بملفات اللوجو السليمة حتى لا تظهر شاشة بيضاء عند بداية تشغيل Android.

## 15) الاختبارات
الموجود حاليًا:
- Expo Doctor.
- ESLint.
- TypeScript.
- Vitest Unit Tests.
- Expo Web Export.
- Playwright E2E public flows.
- Android Release build.

اختبارات مهمة يجب استمرارها وعدم ادعاء Production-Ready قبل اكتمالها:
- عميل: signup/login/order كامل.
- تاجر: signup → onboarding → pending → admin approve → merchant dashboard.
- مندوب: signup → documents → pending → approve → online → accept order → delivered.
- admin approve/reject end-to-end.
- network failure/offline.
- PWA.
- OTA حقيقي بعد APK الانتقالية.

## 16) أشياء لا يجوز تفعيلها الآن
- Minimum Order enforcement.
- Proof of Delivery PIN.
- Payment Gateway.
- SMS OTP.
- Google Maps API مدفوع.
- Coupon discounts at checkout.

## 17) خريطة التطوير الأساسية
المشروع مبني على خطة Production Hardening طويلة تشمل الأمن، Auth، PIN، Trusted Devices، RBAC، RLS، قاعدة بيانات كمصدر الحقيقة، Orders security، driver claim/capacity، commission، GPS/maps، payments، complaints/audit، Telegram security، backups، إزالة mock data، merchant/driver applications، ratings، notifications، PWA، accessibility، network handling، lint/build/security/env settings وتجربة العميل النهائية.

## 18) المتبقي المعروف
- استبدال اللوجو الحالي باللوجو الأخير المختار وإنشاء PNGs سليمة.
- native Splash حقيقي + adaptive icon + PWA icons.
- إعادة CI حتى يصبح أخضر كاملًا.
- بناء APK انتقالية جديدة تحتوي `expo-updates` والهوية الجديدة.
- إضافة/تأكيد Android signing ثابت للإصدارات المستقبلية قبل توزيع واسع.
- إضافة `EXPO_TOKEN` كـGitHub Secret وتشغيل أول OTA Production فعلي.
- اختبار أن APK الانتقالية تستقبل OTA من نفس التطبيق.
- Authenticated E2E كامل للأدوار.
- تحسين صفحات Merchant management/report وDriver operations وAdmin operations المتبقية بصريًا.
- تحسين اختيار الموقع بخريطة، ودعم الكاميرا مباشرة للمستندات والصور.
- عرض صورة وبيانات المندوب للعميل أثناء التتبع.
- استكمال network/offline UI وPWA icons والتدقيق الأمني النهائي.

## 19) قاعدة الاستكمال في أي شات جديد
إذا قال المستخدم بالعربي: `كمل مشروع طلباتك دليفري من آخر حاجة وصلنا لها` أو `كمل التطبيق من آخر نقطة`:
1. اقرأ هذا الملف أولًا.
2. راجع `main` وآخر CI/Android runs.
3. لا تعدل المستودع القديم.
4. لا تفترض أن أي خطوة انتهت إلا إذا الكود والـCI يثبتان ذلك.
5. استمر من قسم `المتبقي المعروف` وحدّث هذا الملف مع كل دفعة تعديلات مهمة.
