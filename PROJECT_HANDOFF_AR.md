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
- Vercel للمشروع الجديد فقط؛ لا تلمس مشروع Vercel القديم.

## 2) Supabase
- Project ref: `vriwhtuxagnbfxybjviz`.
- URL: `https://vriwhtuxagnbfxybjviz.supabase.co`.
- Region الحي الصحيح: `eu-north-1`، والحالة Healthy.
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

## 4) التسجيل والدخول والجلسات
- التسجيل: عميل / تاجر / مندوب.
- Phone + Password، بدون SMS OTP.
- يوجد تأكيد كلمة المرور في التسجيل وإظهار/إخفاء كلمة المرور.
- نجاح تسجيل الدخول منفصل عن تحميل الصلاحيات.
- العميل ينتقل مباشرة للواجهة بعد التسجيل ولا يحتاج موافقة إدارة.
- Supabase Auth يستخدم `persistSession: true` + `autoRefreshToken: true`.
- Native auth storage عبر `expo-secure-store` وليس localStorage.
- من 2026-09-13: الجلسة تبقى مفتوحة 72 ساعة بعد تسجيل دخول/تسجيل جديد، ثم يطلب التطبيق Interactive Login مرة أخرى. لا يتم تخزين كلمة المرور.
- الحساب الموقوف يتم تسجيل خروجه محليًا عند التحقق.

## 5) إصلاح مشكلة تجهيز الحساب — 2026-09-13
السبب الجذري الذي ظهر على الموبايل:
- `has_role()` و`is_admin()` كانتا تقرآن `public.user_roles` من داخل RLS policies على نفس الجدول/جداول تعتمد عليه.
- هذا تسبب في RLS recursion أثناء قراءة `profiles` / `user_roles`، فكان تسجيل الدخول ينجح لكن تحميل الصلاحيات يفشل ويظهر `تعذر تجهيز حسابك` أو `تعذر التحقق من حالة الحساب` للعميل والأدمن.

الإصلاح المنفذ:
- migration: `202609131535_fix_role_policy_recursion.sql`.
- `has_role(public.app_role)` و`is_admin()` أصبحتا `SECURITY DEFINER` مع `search_path = pg_catalog, public`.
- EXECUTE مقيد بشكل مناسب؛ `has_role` للمستخدمين authenticated، و`is_admin` متاح كذلك لـanon لأن public-read policies تستدعيه ويعيد false عند `auth.uid() is null`.
- migration إضافية: `202609131545_allow_anon_safe_admin_check.sql`.
- تم اختبار RLS تحت role `authenticated` بدون recursion.
- تم اختبار قراءة `maintenance_mode` تحت role `anon` بنجاح.

## 6) سرعة فتح التطبيق — 2026-09-13
- AppGate لم يعد ينفذ auth + admin role round-trips على كل فتح عادي.
- فحص maintenance أصبح خفيفًا وغير حاجب للواجهة أثناء انتظار الشبكة.
- lookup لدور admin لا يحدث إلا إذا كان maintenance mode مفعّلًا فعليًا.
- stale/refetch لفحص الصيانة = 5 دقائق بدل فحص متكرر كل 30 ثانية.
- OTA لا يمنع الفتح لأن `fallbackToCacheTimeout = 0`.

## 7) Onboarding التاجر
- اسم النشاط، التصنيف، العنوان، اللوجو/صورة المتجر، GPS.
- بعد الإرسال: Pending.
- موافقة الأدمن فقط تمنح `merchant` وتجهز المتجر.
- المتجر الجديد يبدأ `is_open=false`.
- `public-media` للصور العامة، و`onboarding-documents` للمستندات الخاصة.

## 8) Onboarding المندوب
- الاسم/الهاتف من الحساب، صورة شخصية، Motorcycle أو Bicycle.
- Motorcycle: النوع/الموديل + رخصة قيادة أمام/خلف + رخصة المركبة أمام/خلف.
- Bicycle لا يطلب مستندات الدراجة النارية.
- المستندات الخاصة في bucket خاص.
- Pending حتى موافقة الأدمن فقط.

## 9) لوحة الإدارة
- Control Center منفصلة عن واجهة العميل.
- KPIs + طلبات التاجر/المندوب + المستندات عبر Signed URLs.
- Approve/Reject.
- الاشتراكات والكاشير وعمولة المندوب.
- التحكم بالخدمات والإعلانات والبنية الأساسية.

## 10) الاشتراكات/الكاشير/العمولة
- Merchant subscription required = false.
- Merchant default price = 0.
- Cashier subscription required = false.
- Cashier default price = 0.
- Driver platform commission = 0%.
- المندوب يحصل حاليًا على 100%.

## 11) الإعلانات
- `ad_slots`, `ad_campaigns`.
- Home Top / Home Inline / Store Bottom معطلة افتراضيًا.
- لا Ads داخل Checkout / Order Tracking / Adhkar.
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
- يحتاج `EXPO_TOKEN` كـGitHub Secret لتشغيل أول OTA Production حقيقي.
- JS/UI/assets يمكن تحديثها OTA داخل نفس runtime؛ Native changes تحتاج APK جديدة.

## 14) اللوجو والهوية
- الهوية المعتمدة: شنطة توصيل برتقالية + location pin، وأسفلها `Talabatk Delivery` في اللوجو الكامل.
- الأيقونة: نفس الرمز Flat Orange/White.
- `assets/app-icon.png`, `assets/adaptive-icon.png`, `assets/brand-logo.png` مستخدمة فعليًا.
- PWA icons: `public/icons/icon-192.png` و`icon-512.png`.

## 15) Splash وشاشة التحميل
- `index` مخفي من Stack.
- AppGate branded باسم `طلباتك دليفري` وعبارة `كل اللي محتاجه أقرب ليك`.
- Native splash يستخدم `assets/brand-logo.png` على خلفية بيضاء.

## 16) نسخة Android الحالية — 2026-09-13
- App version: `0.1.2`.
- Android `versionCode = 3`.
- Commit build baseline: `340730cca375514c2c67c91601fc008807439787`.
- CI run #262: ✅ Doctor / Lint / TypeScript / Unit / Web Export / Playwright E2E كلها نجحت.
- Android APK run #184: ✅ Release APK build + artifact upload نجح.
- Artifact: `talabatk-android-release-apk`.
- هذه النسخة تحتوي إصلاح سرعة startup + 72h session policy، بينما إصلاح RLS نفسه Server-side ومطبق حيًا في Supabase.

## 17) أشياء ممنوعة حاليًا
- Minimum Order enforcement.
- Proof of Delivery PIN.
- Payment Gateway.
- SMS OTP.
- Google Maps API مدفوع.
- Coupon discounts at checkout.

## 18) خريطة Production Hardening
الخطة تشمل Security audit، Supabase Auth، password/PIN security، trusted devices، RBAC/RLS، DB source of truth، orders totals/states/atomic driver acceptance/capacity، commission، GPS/OSM+MapLibre، complaints/audit، backup بدون أسرار، إزالة mock data، applications، ratings/notifications، PWA/service worker/dark mode، mobile UI/accessibility/network handling، lint/build/security/env/admin settings، ثم final production check.

## 19) المتبقي المعروف — حسب الأولوية
1. تثبيت وتجربة APK 0.1.2 على جهاز حقيقي، خصوصًا العميل والأدمن بعد إصلاح RLS.
2. التأكد أن versionCode 3 يتثبت فوق النسخة السابقة بدون حذف التطبيق؛ لو فشل نثبت Android signing دائم قبل أي توزيع واسع.
3. إضافة `EXPO_TOKEN` وتشغيل أول OTA Production حقيقي على runtime 0.1.2.
4. اختبار أن APK 0.1.2 تستقبل OTA فعليًا.
5. Authenticated E2E الحقيقي: customer signup/login/order؛ merchant signup→onboarding→pending→approve→dashboard؛ driver docs→pending→approve→online→accept→delivered؛ admin approve/reject.
6. فحص RLS/RPC negative tests ضد IDOR/BOLA والتنافس على قبول الطلب.
7. تحسين Merchant reports / Driver operations / Admin operations.
8. تحسين map picker + camera capture.
9. عرض صورة/بيانات المندوب للعميل أثناء lifecycle المسموح.
10. Network/offline UI + PWA final audit.
11. Store hours UI + CSV + nearby distance + background driver location.
12. Supabase security/performance advisors ثم remediate.
13. Live ads فقط بعد IDs الحقيقية والـconsent.

## 20) قاعدة الاستكمال
إذا قال المستخدم `كمل`:
1. اقرأ هذا الملف.
2. راجع آخر `main` وآخر CI/Android run.
3. لا تلمس المستودع القديم.
4. لا تعتبر أي خطوة منتهية بدون دليل من الكود/DB/CI.
5. ابدأ من قسم المتبقي المعروف.
6. حدّث هذا الملف بعد أي دفعة عمل كبيرة.
