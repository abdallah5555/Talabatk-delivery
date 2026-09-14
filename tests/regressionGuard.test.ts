import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('critical regression guard',()=>{
  it('keeps every critical product route present',()=>{
    const routes=[
      'app/index.tsx','app/login.tsx','app/signup.tsx','app/home.tsx','app/account.tsx','app/profile.tsx','app/search.tsx','app/assistant.tsx','app/order-chat/[id].tsx','app/rewards.tsx','app/wallet.tsx','app/fleet.tsx',
      'app/addresses.tsx','app/favorites.tsx','app/checkout.tsx','app/orders.tsx','app/order/[id].tsx',
      'app/onboarding.tsx','app/pending-approval.tsx','app/role/[role].tsx','app/store/[id].tsx',
      'app/admin/index.tsx','app/admin/applications.tsx','app/admin/operations.tsx','app/admin/commerce.tsx','app/admin/finance.tsx',
      'app/merchant/[storeId].tsx','app/driver-operations.tsx','app/security.tsx','app/support.tsx'
    ];
    for(const route of routes) expect(existsSync(new URL(`../${route}`,import.meta.url)),route).toBe(true);
  });

  it('prevents production web deploys from bypassing CI',()=>{
    const workflow=read('.github/workflows/deploy-web-vercel.yml');
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('workflows: [ci]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
  });

  it('prevents automatic APK builds from racing ahead of CI',()=>{
    const workflow=read('.github/workflows/android-apk.yml');
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain('workflows: [ci]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).not.toMatch(/\npush:\s*\n\s*branches:\s*\[main\]/);
    expect(workflow).toContain('Verify manually requested build before compiling');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run test');
  });

  it('prevents manual production OTA from skipping verification',()=>{
    const workflow=read('.github/workflows/ota-production.yml');
    expect(workflow).toContain('Verify manually requested OTA before publishing');
    expect(workflow).toContain('npm run doctor');
    expect(workflow).toContain('npm run lint');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run test');
    expect(workflow).toContain('npm run export:web');
  });

  it('keeps core security/auth boundaries in CI',()=>{
    const ci=read('.github/workflows/ci.yml');
    for(const command of ['npm run doctor','npm run lint','npm run typecheck','npm run test','npm run test:backend-auth','npm run export:web','npm run e2e'])expect(ci).toContain(command);
    const auth=read('src/lib/auth.ts');
    expect(auth).toContain('signInPhonePassword');
    expect(auth).toContain('assertActive');
    expect(auth).toContain('REAUTH_WINDOW_MS=72*60*60*1000');
  });

  it('locks the recently fixed profile, map and OTA flows into the regression suite',()=>{
    const map=read('app/addresses.tsx');
    const profile=read('app/profile.tsx');
    const ota=read('src/components/OtaUpdateBanner.tsx');
    expect(map).toContain('GeoJSONSource');
    expect(map).toContain('selected-address-dot');
    expect(profile).toContain('expo-image-picker');
    expect(profile).toContain("storage.from('profile-avatars')");
    expect(profile).toContain("supabase.rpc('update_my_profile_details'");
    expect(ota).not.toContain('reloadAsync(');
  });

  it('keeps the universal marketplace and assistant entry points wired',()=>{
    const home=read('app/home.tsx');
    const search=read('app/search.tsx');
    const assistant=read('app/assistant.tsx');
    expect(home).toContain("router.push('/assistant')");
    expect(home).toContain("pathname:'/search'");
    expect(search).toContain('MARKETPLACE_CATEGORIES');
    expect(search).toContain('getMarketplaceCatalog');
    expect(assistant).toContain('buildAssistantReply');
    expect(assistant).toContain("pathname:'/search'");
  });

  it('keeps order chat participant-scoped and immutable from the client',()=>{
    const migration=read('supabase/migrations/202609141055_secure_order_chat.sql');
    const client=read('src/lib/orderChat.ts');
    expect(migration).toContain('security definer');
    expect(migration).toContain("sender_id = auth.uid()");
    expect(migration).toContain('public.can_access_order_chat(order_id)');
    expect(migration).toContain('grant select, insert on public.order_messages to authenticated');
    expect(migration).not.toContain('grant update');
    expect(migration).not.toContain('grant delete');
    expect(client).toContain("from('order_messages')");
    expect(client).toContain("event:'INSERT'");
  });

  it('keeps rotating adhkar reminders and Android exact-alarm capability',()=>{
    const adhkar=read('src/lib/adhkar.ts');
    const config=JSON.parse(read('app.json'));
    expect(adhkar).toContain('adhkarReminderCycle');
    expect(adhkar).toContain('SchedulableTriggerInputTypes.DATE');
    expect(adhkar).toContain('getAllScheduledNotificationsAsync');
    expect(adhkar).not.toContain('const reminderDhikr=');
    expect(config.expo.android.permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM');
  });

  it('keeps guided issue handling and direct order notification navigation',()=>{
    const support=read('app/support.tsx');
    const notifications=read('app/notifications.tsx');
    const migration=read('supabase/migrations/202609141350_notification_order_deep_links.sql');
    for(const phrase of ['منتج ناقص','طلب غلط','منتج تالف','الطلب متأخر','مشكلة مع المندوب'])expect(support).toContain(phrase);
    expect(support).toContain('orderId');
    expect(migration).toContain('order_id uuid references public.orders');
    expect(notifications).toContain('order_id');
    expect(notifications).toContain("pathname:'/order/[id]'");
  });

  it('keeps loyalty points server-authoritative and referral rewards idempotent',()=>{
    const migration=read('supabase/migrations/202609141430_customer_loyalty_and_referrals.sql');
    const client=read('src/lib/rewards.ts');
    const assistant=read('src/lib/assistant.ts');
    expect(migration).toContain('alter table public.reward_wallets enable row level security');
    expect(migration).toContain('security definer');
    expect(migration).toContain('reward_events_delivered_order_unique');
    expect(migration).toContain("source='order_delivered'");
    expect(migration).toContain('referred_user_id<>referrer_user_id');
    expect(client).toContain("supabase.rpc('get_my_rewards')");
    expect(client).toContain("supabase.rpc('claim_referral_code'");
    expect(assistant).toContain("href:'/rewards'");
  });

  it('keeps company managers scoped instead of granting platform admin',()=>{
    const fleet=read('supabase/migrations/202609141500_fleet_finance_rewards_foundation.sql');
    expect(fleet).toContain('owner_user_id uuid not null');
    expect(fleet).toContain("owner_user_id=auth.uid()");
    expect(fleet).toContain('fleet_drivers_read');
    expect(fleet).not.toContain("role='admin'");
    expect(fleet).not.toContain("'fleet_admin'");
  });

  it('keeps commission settlement server-side, idempotent and wallet-enforced',()=>{
    const settlement=read('supabase/migrations/202609141510_settlement_quality_wallet_enforcement.sql');
    const foundation=read('supabase/migrations/202609141500_fleet_finance_rewards_foundation.sql');
    expect(settlement).toContain('settle_delivered_order');
    expect(settlement).toContain('trg_settle_delivered_order');
    expect(settlement).toContain("-driver_platform_amount");
    expect(settlement).toContain("-merchant_amount");
    expect(settlement).toContain('محفظتك وصلت لحد المديونية');
    expect(settlement).toContain('محفظة المتجر وصلت لحد المديونية');
    expect(foundation).toContain('finance_ledger_order_type_unique');
    expect(foundation).toContain('wallet_enforcement_enabled boolean not null default false');
    expect(foundation).toContain('driver_platform_commission_percent');
    expect(foundation).toContain('fleet_platform_commission_percent');
  });

  it('uses rating as a configurable bonus snapshot without punitive base-pay deductions',()=>{
    const settlement=read('supabase/migrations/202609141510_settlement_quality_wallet_enforcement.sql');
    const admin=read('app/admin/finance.tsx');
    expect(settlement).toContain('rating_snapshot');
    expect(settlement).toContain('quality_bonus_amount');
    expect(settlement).toContain('greatest(0,gross+bonus_amount-driver_platform_amount-fleet_driver_amount)');
    expect(admin).toContain('مفيش خصم عقابي تلقائي بسبب تقييم واحد');
  });

  it('awards points to customers drivers and merchants and consumes rewards server-side',()=>{
    const foundation=read('supabase/migrations/202609141500_fleet_finance_rewards_foundation.sql');
    const settlement=read('supabase/migrations/202609141510_settlement_quality_wallet_enforcement.sql');
    const consume=read('supabase/migrations/202609141530_consume_role_rewards_on_orders.sql');
    expect(foundation).toContain("'driver_delivery'");
    expect(foundation).toContain("'merchant_order'");
    expect(settlement).toContain("source,order_id,note) values(NEW.driver_id,cfg.driver_points_per_delivery,'driver_delivery'");
    expect(settlement).toContain("merchant_owner,cfg.merchant_points_per_delivered_order,'merchant_order'");
    expect(consume).toContain("rc.reward_type='free_delivery'");
    expect(consume).toContain('v_fee:=0');
    expect(consume).toContain("rc.reward_type='commission_free_next_order'");
    expect(consume).toContain("status='used'");
  });

  it('keeps the new finance fleet and wallet control surfaces wired',()=>{
    const admin=read('app/admin/index.tsx');
    const account=read('app/account.tsx');
    const layout=read('app/_layout.tsx');
    expect(admin).toContain("router.push('/admin/finance')");
    expect(account).toContain("router.push('/wallet')");
    expect(account).toContain("router.push('/fleet')");
    expect(layout).toContain('name="wallet"');
    expect(layout).toContain('name="fleet"');
  });
});
