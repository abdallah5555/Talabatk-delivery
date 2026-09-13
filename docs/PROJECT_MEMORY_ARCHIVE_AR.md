# أرشيف ذاكرة مشروع طلباتك دليفري

> الغرض من هذا الملف هو حفظ السياق المتراكم من المحادثات والملفات القديمة والقرارات التي أدت إلى الحالة الحالية. **الحالة التنفيذية الحية** تُحسم دائمًا من `PROJECT_HANDOFF_AR.md` + آخر `main` + GitHub Actions + Supabase الفعلي. عند التعارض، الكود/قاعدة البيانات/CI الأحدث هي المرجع.

## 1) هوية المشروع والمستودعات
- المشروع الحالي: **Talabatk Delivery / طلباتك دليفري**.
- المستودع الحالي الوحيد المسموح تعديله: `abdallah5555/Talabatk-delivery`.
- الفرع الأساسي: `main`.
- المستودع القديم `abdallah5555/Talbak-delivery` أصبح Legacy ويُمنع البناء عليه أو خلطه بالمشروع الجديد.
- الملفات القديمة مثل `index.html` و`Talabatk_Delivery_Master_Requirements.md` تمثل Prototype/متطلبات تاريخية فقط، ولا تتقدم على `docs/TALABATK_FINAL_SPEC_2026.md` أو الحالة الحالية للكود.

## 2) القرار المعماري النهائي
- كود موحد: React Native + Expo + TypeScript + Expo Router.
- Android: تطبيق Native يوزع كـAPK مباشر بدون Google Play.
- iPhone/iPad: Web/PWA من نفس المشروع عبر Safari، بدون App Store.
- Admin: دور محمي داخل نفس المنتج، وليس مشروعًا منفصلًا.
- Backend: Supabase PostgreSQL/Auth/Realtime/Storage/RLS.
- الاستضافة الويب: Vercel لمشروع `Talabatk-delivery` الجديد فقط؛ لا يتم لمس مشروع Vercel القديم.
- Server state: TanStack Query.
- الخرائط: MapLibre + بيانات/tiles مبنية على OpenStreetMap ومصدر مجاني قابل للتغيير؛ لا Google Maps API مدفوع.
- اللغة الإنتاجية: عربية RTL، Mobile-first.
- الهدف الثابت: تشغيل حقيقي قدر الإمكان على خدمات مجانية، وعدم جعل أي خدمة مدفوعة Dependency أساسية.

## 3) قواعد المنتج التي لا يجوز كسرها
الأدوار: `customer / merchant / driver / admin`.
- العميل يتفعل فور التسجيل ولا يحتاج موافقة الأدمن.
- التاجر لا يحصل على صلاحية التشغيل إلا بعد موافقة الأدمن.
- المندوب لا يحصل على صلاحية التشغيل إلا بعد موافقة الأدمن.
- المستخدم قد يملك أكثر من دور Approved مع Role Switcher حسب المواصفة النهائية، لكن الصلاحيات مصدرها السيرفر لا client flags.
- Pending merchant/driver ممنوع من الوصول للوحة التشغيل حتى بفتح الرابط يدويًا.
- Admin يذهب إلى `/admin` ولا يُجبر على واجهة العميل.
- التسجيل والدخول Phone + Password، بدون SMS OTP.
- لا تعرض رسائل تقنية للمستخدم مثل تفاصيل بنية الأدوار أو “بدون SMS” كرسائل تسويقية في شاشة الدخول.

## 4) اتجاه الأمن المتراكم من المشروع القديم والجديد
- Supabase هو Source of Truth، وليس localStorage.
- لا تعتمد على localStorage لمنح auth/roles/trusted-device permissions.
- RBAC + RLS إلزاميان، مع negative tests ضد IDOR/BOLA والوصول عبر الأدوار.
- السعر والإجمالي وحالات الطلب والانتقالات الحساسة تكون Server-authoritative.
- قبول المندوب للطلب يجب أن يكون Atomic لمنع سباق مندوبين على نفس الطلب.
- PIN/Trusted Devices — عند تفعيلها — تحققها Server-side، ولا يُعاد `pin_hash` للعميل، مع lockout ومحاولات محدودة.
- لا Service Role أو secrets داخل المستودع العام.
- `SECURITY DEFINER` يستخدم فقط عند الضرورة مع `search_path` آمن وschema-qualified names وصلاحيات استدعاء مضبوطة.
- بيانات التواصل والخصوصية تظهر فقط عند مرحلة lifecycle المسموح بها.
- Backup/exports لا تحتوي أسرارًا.

## 5) نطاق العميل المطلوب النهائي
- اكتشاف وبحث وفلاتر للمتاجر والخدمات.
- Store/Menu + availability/stock/variants حسب البيانات.
- Favorites.
- عناوين متعددة + اختيار موقع + إدخال يدوي دائمًا.
- Cart آمن يدعم multi-store، مع إعادة تحقق من السعر والتوفر قبل الطلب.
- Checkout مع minimum order = 0، والدفع الحالي Cash أو merchant-paid-online/manual فقط.
- Scheduled orders.
- Timeline وتتبع Realtime مع driver position/stale/reconnecting states.
- History + Reorder مع إعادة تحقق.
- Ratings/Reviews بعد delivered فقط.
- Notifications + complaints/support + account/privacy/deletion flow.

## 6) نطاق التاجر
- Application → Pending → Admin Approve/Reject.
- Store profile/category/address/map/logo/hours/open-closed/service area.
- Menu/Product/Inventory management.
- Incoming order lifecycle + realtime alerts.
- POS/manual sales والكاشير.
- Revenue/reports/best sellers/status distribution/CSV.
- التاجر لا يرى أو يعدل طلبات تاجر آخر.

## 7) نطاق المندوب
- Application → Pending → Admin Approve/Reject.
- On Duty / Off Duty محفوظ في قاعدة البيانات.
- GPS/current location.
- Nearby eligible orders.
- Atomic claim + capacity/batching.
- Pickup/delivery lifecycle + earnings + issue reporting.
- العمولة الحالية للمنصة 0% والمندوب يحصل على 100% إلى أن تغيّر الإدارة الإعدادات لاحقًا.

## 8) نطاق الإدارة
- Users/Roles/Applications.
- Stores/Orders/Complaints.
- Approve/Reject للتجار والمندوبين مع عرض المستندات الخاصة عبر Signed URLs.
- Settings/service areas/maintenance mode.
- Audit logs + suspicious activity indicators + free-tier/health indicators.
- التحكم في الاشتراكات/الكاشير/عمولة المندوب والخدمات والإعلانات.
- Analytics/SQL وتقارير التشغيل.

## 9) قرارات تجارية حالية
- Merchant subscription required = false، default price = 0.
- Cashier subscription required = false، default price = 0.
- Driver platform commission = 0%.
- النظام مصمم لتغيير القيم لاحقًا بدون إعادة كتابة تاريخ أرباح الطلبات القديمة.
- Coupon discounts at checkout معطلة حاليًا.
- Payment Gateway خارج النطاق الحالي.

## 10) Onboarding الحالي المتفق عليه
### Merchant
اسم النشاط، التصنيف، العنوان، اللوجو/الصورة، GPS → Pending → موافقة الأدمن. المتجر الجديد يبدأ `is_open=false` حتى يجهزه التاجر ويفتحه.

### Driver
الاسم/الهاتف من الحساب + صورة شخصية + Motorcycle أو Bicycle. الدراجة النارية تحتاج نوع/موديل ورخصة قيادة أمام/خلف ورخصة المركبة أمام/خلف. Bicycle لا يطلب مستندات Motorcycle. المستندات في Storage خاص، والصورة الشخصية يمكن أن تصبح Avatar بعد الموافقة.

## 11) ميزات خاصة أضيفت أثناء التطوير
- صفحة أذكار صباح/مساء Offline، عدادات محلية، إشعارات محلية اختيارية، بدون Ads داخل الصفحة.
- بنية Ads: `ad_slots` و`ad_campaigns`، ومواقع Home Top / Home Inline / Store Bottom Disabled افتراضيًا.
- لا Ads داخل Checkout / Order Tracking / Adhkar.
- `react-native-google-mobile-ads` موجود وAndroid AdMob App ID مضبوط؛ Banner Ad Unit IDs الحقيقية والـconsent/privacy ما زالت خارج الإكمال الحالي.

## 12) الهوية والـUX
- اللوجو المعتمد النهائي: شنطة توصيل برتقالية + location pin، مع اسم `Talabatk Delivery` في النسخة الكاملة.
- أي لوجو أقدم ملغى.
- App/PWA icons مأخوذة من نفس الرمز وبنسخة Flat Orange/White واضحة في المقاسات الصغيرة.
- `index` الافتراضي مخفي من العناوين.
- شاشة AppGate/Loading branded باسم `طلباتك دليفري` وعبارة `كل اللي محتاجه أقرب ليك` بدل شاشة بيضاء صامتة.
- تمت إعادة تصميم Login, Signup, Home, Account, Store, Checkout, Orders, Tracking, Merchant/Driver/Admin dashboards, Applications, Onboarding, Pending Approval.

## 13) Expo OTA
- Project ID: `1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- `expo-updates` جزء من المشروع.
- `runtimeVersion.policy = appVersion`.
- updates URL: `https://u.expo.dev/1a617642-b1c4-4a68-8fa5-98c0ad3c7911`.
- Workflow: `.github/workflows/ota-production.yml`.
- يحتاج `EXPO_TOKEN` كـGitHub Secret، ولا يوضع في الكود.
- JS/UI/assets يمكن تحديثها OTA داخل نفس runtime؛ native changes تحتاج APK جديدة.

## 14) الاختبارات والتسليم
Pipeline المعتمد حاليًا:
1. Expo dependency/doctor check
2. ESLint
3. TypeScript
4. Vitest
5. Expo Web Export
6. Playwright E2E
7. Android APK workflow منفصل

قاعدة التسليم: لا نعتبر المنتج Production-Ready لمجرد نجاح build أو اختبارات عامة. يجب إكمال authenticated E2E الحقيقي للأدوار، RLS/RPC negative tests، حالات الشبكة/عدم التكرار، PWA، Android build/signing، وOTA الفعلي أو توثيق blocker خارجي فقط.

## 15) الدروس/الفجوات التاريخية من الـLegacy
الاختبارات القديمة نجحت في أجزاء browser/cache/build، لكنها كشفت أهمية عدم الاكتفاء بالـhappy path. لذلك المواصفة الجديدة تشمل صراحة:
- IDOR/BOLA/RLS cross-role tests.
- concurrency وatomic driver acceptance.
- server-authoritative pricing/totals.
- driver failure states وstale GPS.
- network failure/retry/no duplicate orders.
- service-worker/manifest/installability/offline paths.
- إزالة mock data من production paths.

## 16) أشياء ممنوعة حاليًا
- Minimum Order enforcement؛ القيمة المطلوبة = 0.
- Proof of Delivery PIN.
- Payment Gateway.
- SMS OTP.
- Google Maps API مدفوع.
- Coupon discounts at checkout.
- جعل أي خدمة مدفوعة شرطًا لتشغيل المنتج.

## 17) مصدر الحقيقة وترتيب القراءة لأي نموذج/جلسة جديدة
1. `PROJECT_HANDOFF_AR.md` للحالة التشغيلية الأخيرة.
2. آخر `main` والـcommits الفعلية.
3. آخر GitHub Actions CI + Android runs.
4. Supabase project الفعلي ومراجعة schema/RLS/advisors عند الحاجة.
5. `docs/TALABATK_FINAL_SPEC_2026.md` للمواصفة الملزمة.
6. `docs/FREE_ONLY_POLICY.md` لقاعدة التكلفة.
7. `CODEX_START_HERE.md` و`AGENTS.md` لطريقة التنفيذ.
8. هذا الملف للسياق التاريخي وقرارات المحادثات.
9. المتطلبات/Prototype القديمة للسياق فقط عند عدم التعارض.

## 18) لقطة موحدة بتاريخ 2026-09-13
- آخر `main` وقت إنشاء هذه اللقطة: `f7cb760129e7fb15e9bbc2049798a63383ae12d5` بعنوان `security: finalize auth and PWA hardening`.
- هذا التغيير أزال اعتماد Web Auth/Trusted Device على localStorage، وحسّن PWA branding ودوّر shell cache بعد نجاح full CI.
- CI run #256 على هذا الـcommit: **Success**.
- Android APK run #180 على نفس الـcommit كان **In progress** وقت آخر فحص؛ يجب إعادة فحصه قبل اعتبار APK الحالية مكتملة.
- Supabase live project `vriwhtuxagnbfxybjviz` حالته `ACTIVE_HEALTHY` على PostgreSQL 17.6.1.155. الفحص الحي بتاريخ 2026-09-13 أعاد Region = `eu-north-1`؛ هذه القيمة الحية تتقدم على أي Region أقدم مكتوب في handoff.

## 19) المتبقي العملي المعروف بعد دمج ذاكرة المحادثات
- إنهاء/تأكيد Android APK build الحالي ثم استخراج APK انتقالية قابلة للتثبيت.
- تأكيد Android signing ثابت قبل التوزيع حتى يمكن تثبيت الإصدارات اللاحقة فوق السابقة.
- إضافة `EXPO_TOKEN` وتشغيل أول OTA Production حقيقي واختبار استقبال التطبيق له.
- Authenticated E2E كامل: Customer signup/login/order؛ Merchant signup→onboarding→pending→approve→dashboard؛ Driver docs→pending→approve→online→accept→delivered؛ Admin approve/reject.
- Security/RLS/RPC negative tests والتأكد من عدم وجود cross-role/IDOR regressions.
- تحسين Map location picker + camera capture للصور والمستندات.
- إظهار بيانات/صورة المندوب للعميل في التتبع وفق الخصوصية/lifecycle.
- إكمال Network/offline/retry UI وتدقيق PWA النهائي.
- Store hours UI وCSV reports وnearby-order distance وbackground driver location وباقي final hardening.
- تحسين Merchant management/report وDriver/Admin operations بصريًا ووظيفيًا حيث ما زالت ناقصة.
- الإعلانات الحقيقية فقط بعد Ad Unit IDs + consent/privacy/test devices.
- مراجعة Supabase advisors والـschema/RLS الحاليين قبل إعلان Production-Ready.

## 20) قاعدة العمل المستمرة
عند قول المستخدم “كمل” أو “كمل من آخر نقطة”: لا نعيد التصميم من الصفر، لا نرجع للـLegacy، ولا نتوقف عند خطة أو build ناجح. نقرأ المصادر أعلاه، نتحقق من الحالة الحية، ثم نكمل الإصلاح والاختبارات حتى Definition of Done، مع تحديث `PROJECT_HANDOFF_AR.md` بعد كل دفعة مهمة.