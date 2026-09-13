# ملف متابعة مشروع طلباتك دليفري

> **هذا الملف هو مصدر الحقيقة التشغيلي للاستكمال في أي محادثة جديدة.** قبل تعديل أي شيء: اقرأ هذا الملف، راجع آخر `main` وآخر CI/Android runs، ثم راجع `docs/PROJECT_MEMORY_ARCHIVE_AR.md` للتاريخ الكامل. الكود/قاعدة البيانات/CI الحيّة لها الأولوية على أي وصف قديم.

## 1) المشروع الصحيح
- المستودع الوحيد المسموح تعديله: `abdallah5555/Talabatk-delivery`.
- **ممنوع تعديل** المستودع القديم `abdallah5555/Talbak-delivery`.
- الفرع الأساسي: `main`.
- React Native + Expo SDK 57 + TypeScript + Expo Router.
- Android: APK مباشر للتثبيت.
- iPhone/iPad: Web/PWA من نفس المشروع.
- Backend: Supabase Free.
- Vercel للمشروع الجديد فقط؛ لا تلمس مشروع Vercel القديم.

## 2) Supabase
- Project ref: `vriwhtuxagnbfxybjviz`.
- URL: `https://vriwhtuxagnbfxybjviz.supabase.co`.
- Region الحي الصحيح: `eu-north-1`.
- لا تضع Service Role أو Secrets في المستودع العام.
- DDL عبر migrations/apply migration، والفحوص/البيانات عبر SQL.
- `SECURITY DEFINER` يجب أن يكون محدود الصلاحية، schema-qualified، و`search_path` آمن.

## 3) الأدوار وقواعد التفعيل
الأدوار: `customer / merchant / driver / admin`.
- العميل يتفعل فور التسجيل ولا يحتاج موافقة إدارة.
- التاجر لا يحصل على `merchant` إلا بعد موافقة الأدمن.
- المندوب لا يحصل على `driver` إلا بعد موافقة الأدمن.
- Approved merchant → `/role/merchant`.
- Approved driver → `/role/driver`.
- Admin → `/admin` فقط، وليس واجهة العميل.
- Pending merchant/driver → `/pending-approval`.
- التاجر/المندوب غير المكتمل → `/onboarding`.

## 4) التسجيل والدخول والجلسات
- Phone + Password، بدون SMS OTP.
- تأكيد كلمة المرور + إظهار/إخفاء الباسورد.
- Supabase Auth: `persistSession: true` + `autoRefreshToken: true`.
- Native storage عبر `expo-secure-store` وليس localStorage.
- الجلسة تبقى مفتوحة **72 ساعة** بعد تسجيل دخول/تسجيل جديد، ثم يطلب Interactive Login مرة أخرى.
- لا يتم تخزين كلمة المرور.
- مفتاح re-auth الحالي صالح لـAndroid SecureStore: `talabatk_last_interactive_auth_at`.
- عند مسح رقم الهاتف بالكامل من شاشة الدخول يتم مسح كلمة المرور تلقائيًا.
- الحساب الموقوف يسجل خروجًا محليًا عند التحقق.

## 5) إصلاحات Auth/RLS المنفذة 2026-09-13
### أ) مشكلة `تعذر تجهيز حسابك`
السبب كان RLS recursion في `has_role()` / `is_admin()` أثناء قراءة `user_roles`.
- migrations:
  - `202609131535_fix_role_policy_recursion.sql`
  - `202609131545_allow_anon_safe_admin_check.sql`
- `has_role()` و`is_admin()` أصبحتا SECURITY DEFINER بشكل مقيد وآمن.
- تم اختبار القراءة تحت authenticated وقراءة maintenance تحت anon.

### ب) مشكلة لوحة الإدارة `تعذر تحميل لوحة الإدارة`
السبب الحقيقي الذي ظهر على الموبايل كان دورة RLS:
`orders -> driver_status -> orders`.
- migration: `202609131715_break_orders_driver_status_rls_cycle.sql`.
- تمت إضافة helpers مقيدة:
  - `current_driver_is_online()`
  - `customer_can_read_driver_status(uuid)`
- تم إعادة بناء `orders_read` و`driver_status_customer_active_order_read` بدون recursion.
- تم تنفيذ استعلامات لوحة الإدارة تحت **هوية حساب الأدمن الفعلية** ونجحت، بما فيها `admin_get_usage_metrics()`.
- تم اختبار قراءة `orders` و`driver_status` تحت هوية Customer بدون recursion.

### ج) إصلاح نطاق بيانات التواصل الخاصة بالمتجر
تم اكتشاف شرط خاطئ `o.store_id = o.store_id` كان قد يوسع الوصول لبيانات متجر آخر.
- migration: `202609131720_fix_store_private_contacts_order_scope.sql`.
- الشرط الصحيح أصبح ربط الطلب بنفس `store_private_contacts.store_id`.
- توجد regression tests تمنع رجوع الخطأ ودورة RLS السابقة.

## 6) سرعة فتح التطبيق
- AppGate لا ينفذ auth + admin role round-trips على كل فتح طبيعي.
- فحص maintenance غير حاجب للواجهة.
- admin lookup لا يحدث إلا عند تفعيل maintenance فعليًا.
- stale/refetch للصيانة = 5 دقائق.
- OTA لا يمنع الفتح لأن `fallbackToCacheTimeout = 0`.

## 7) Onboarding التاجر
- اسم النشاط، التصنيف، العنوان، اللوجو، GPS.
- مستندات مطلوبة: بطاقة رقم قومي وش/ظهر + سجل تجاري.
- البطاقة الضريبية اختيارية حاليًا.
- migration: `202609131650_expand_onboarding_verification_documents.sql`.
- المستندات الخاصة في `onboarding-documents`، واللوجو العام في `public-media`.
- بعد الإرسال Pending، ولا يتفعل دور التاجر إلا بعد موافقة الأدمن.
- المتجر الجديد يبدأ `is_open=false`.

## 8) Onboarding المندوب
- صورة شخصية + بطاقة رقم قومي وش/ظهر مطلوبة للجميع.
- وسيلة التوصيل: Motorcycle أو Bicycle.
- Motorcycle: النوع/الموديل + رخصة قيادة وش/ظهر + رخصة المركبة وش/ظهر.
- Bicycle لا يطلب رخص الموتوسيكل، لكنه يحتاج الهوية والصورة.
- الفيش/صحيفة الحالة الجنائية متاح اختياريًا حاليًا.
- المستندات الخاصة في `onboarding-documents`.
- Pending حتى موافقة الأدمن.

## 9) لوحة الإدارة
- Control Center منفصلة تمامًا عن واجهة العميل.
- من 2026-09-13 تم إعادة تصميم الصفحة الرئيسية كـDashboard خفيفة ومحترفة بدل صفحة طويلة تجمع كل أدوات الإدارة.
- الصفحة الرئيسية تعرض KPIs وتنبيهات تحتاج قرارًا فقط، ثم تنقل لأقسام منفصلة.
- الأقسام الحالية:
  - `/admin/applications` طلبات الاعتماد والمستندات.
  - `/admin/operations` التشغيل والمستخدمون والمناطق والبلاغات والحذف والتدقيق.
  - `/admin/commerce` الاشتراكات والعمولات وخدمات المتاجر والإعلانات.
- الصفحات الفرعية تستخدم Header عربي وزر رجوع؛ الصفحة الرئيسية بدون Header تقني.
- يوجد زر واضح `تبديل الحساب / تسجيل الخروج` في Dashboard الإدارة.
- Dashboard يستخدم query خفيفة مستقلة `getAdminDashboardSnapshot()` بدل تحميل كل بيانات الإدارة عند كل فتح.
- تم اختبار استعلام Snapshot تحت هوية الأدمن الفعلية: profiles/stores/orders/applications/issues/deletions كلها تعمل بدون RLS recursion.
- Signed URLs للمستندات الخاصة وApprove/Reject للتاجر والمندوب مستمرة كما هي.

## 10) الاشتراكات والكاشير والعمولة
- Merchant subscription required = false.
- Merchant default price = 0.
- Cashier subscription required = false.
- Cashier default price = 0.
- Driver platform commission = 0%.
- المندوب يحصل حاليًا على 100%.

## 11) الإعلانات
- أماكن الإعلانات Home Top / Home Inline / Store Bottom معطلة افتراضيًا.
- لا إعلانات داخل Checkout / Order Tracking / Adhkar.
- Android AdMob App ID مضبوط.
- Banner Ad Unit IDs الحقيقية لم تصل بعد.
- قبل Live Ads: test devices + privacy/consent.

## 12) الأذكار
- صباح/مساء Offline.
- عدادات محلية.
- إشعارات محلية اختيارية.
- بدون إعلانات.

## 13) Expo OTA
- Expo Project ID: `1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `runtimeVersion.policy = appVersion`.
- `updates.url = https://u.expo.dev/1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `checkAutomatically = ON_LOAD`.
- `fallbackToCacheTimeout = 0`.
- `OtaUpdateBanner` يفحص التحديث وينزله ويعيد تحميل التطبيق.
- Workflow: `.github/workflows/ota-production.yml`.
- **البلوكَر الخارجي الحالي:** ما زال أول OTA Production الحقيقي يحتاج `EXPO_TOKEN` داخل GitHub Secret.
- بعد تفعيل السر: JS/UI/assets داخل نفس runtime يمكن تحديثها من داخل التطبيق، والتغييرات Native فقط تحتاج APK جديدة.

## 14) الهوية وSplash
- الهوية المعتمدة: شنطة توصيل برتقالية + location pin + `Talabatk Delivery` في اللوجو الكامل.
- `assets/app-icon.png`, `assets/adaptive-icon.png`, `assets/brand-logo.png` مستخدمة فعليًا.
- PWA icons: `public/icons/icon-192.png`, `icon-512.png`.
- Splash يستخدم `brand-logo.png` ثم شاشة React branded.

## 15) نسخة Android الحالية — 2026-09-13
- App version/runtime: **`0.1.4`**.
- Android `versionCode = 6` لكي تتثبت النسخة الجديدة فوق build 5 مع الحفاظ على نفس OTA runtime.
- Build source commit: `5d79eb0b50acdf370828a603ce5042b4e3bc7f4d`.
- Latest full CI after admin navigation regression guard: **run #291 ✅**
  - Doctor ✅
  - Lint ✅
  - TypeScript ✅
  - Unit/Regression tests ✅
  - Web Export ✅
  - Playwright E2E ✅
- Android APK: **run #202 ✅** Release APK + artifact upload.
- Artifact: `talabatk-android-release-apk`.
- هذه الـAPK تشمل Dashboard الإدارة الجديدة، الأقسام المنفصلة، Header عربي للصفحات الفرعية، زر تبديل الحساب، وكل إصلاحات RLS/Auth السابقة.

## 16) أشياء ممنوعة حاليًا
- Minimum Order enforcement؛ الحد الأدنى يظل 0.
- Proof of Delivery PIN.
- Payment Gateway.
- SMS OTP.
- Google Maps API مدفوع.
- Coupon discounts at checkout.

## 17) المتبقي حسب الأولوية
1. تثبيت وتجربة Android build 6 فوق النسخة الحالية بدون حذف التطبيق، والتأكد من Dashboard الإدارة الجديدة والتنقل بين الأقسام.
2. إضافة `EXPO_TOKEN` وتشغيل أول OTA Production حقيقي على runtime 0.1.4؛ بعد ذلك التعديلات JS/UI العادية لا تحتاج APK جديدة.
3. اختبار أن runtime 0.1.4 تستقبل OTA من داخل التطبيق فعلًا.
4. تثبيت Android signing دائم موثق قبل التوزيع الواسع إذا ظهر أي Build لا يتثبت فوق السابقة.
5. Authenticated E2E الحقيقي end-to-end: customer order؛ merchant docs→approve→dashboard؛ driver docs→approve→online→claim→delivered؛ admin approve/reject.
6. توسيع RLS/RPC negative tests ضد IDOR/BOLA والتنافس على قبول الطلب.
7. تحسين camera capture للمستندات + map picker.
8. تحسين Merchant reports / Driver operations / Admin operations.
9. عرض بيانات المندوب للعميل أثناء lifecycle المسموح.
10. Network/offline UI + PWA final audit.
11. Store hours UI + CSV + nearby distance + background driver location.
12. Supabase security/performance advisors ثم remediate.
13. Live ads فقط بعد IDs الحقيقية والـconsent.

## 18) قاعدة الاستكمال
إذا قال المستخدم `كمل`:
1. اقرأ هذا الملف و`docs/PROJECT_MEMORY_ARCHIVE_AR.md`.
2. راجع آخر `main` وآخر CI/Android run وحالة Supabase الحية.
3. لا تلمس المستودع القديم.
4. لا تعتبر أي خطوة منتهية بدون دليل من code/DB/CI.
5. لا تتوقف عند نجاح Build فقط؛ أكمل اختبارات الأدوار والأمان والـOTA حتى Production gate أو blocker خارجي حقيقي.
6. حدّث هذا الملف بعد أي دفعة عمل كبيرة.
