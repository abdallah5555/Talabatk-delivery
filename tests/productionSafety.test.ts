import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('production safety gates',()=>{
  it('keeps the PWA installable',()=>{
    const manifest=JSON.parse(text('public/manifest.json'));
    expect(manifest.display).toBe('standalone');
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  it('never caches Supabase authenticated API responses in the service worker',()=>{
    const sw=text('public/sw.js');
    const guardIndex=sw.indexOf("url.hostname.endsWith('.supabase.co')");
    const respondWithIndex=sw.indexOf('event.respondWith');
    expect(guardIndex).toBeGreaterThan(-1);
    expect(sw.slice(guardIndex,guardIndex+100)).toMatch(/return\s*;/);
    expect(respondWithIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(respondWithIndex);
  });

  it('does not expose privileged secrets in the public env example',()=>{
    const env=text('.env.example');
    const liveLines=env.split(/\r?\n/).filter((line)=>line.trim()&&!line.trim().startsWith('#')).join('\n');
    expect(liveLines).not.toMatch(/SERVICE_ROLE/i);
    expect(liveLines).not.toMatch(/BOT_TOKEN/i);
    expect(liveLines).not.toMatch(/FCM.*PRIVATE|PRIVATE.*FCM/i);
  });

  it('grants the customer role only to customer registrations',()=>{
    const signup=text('supabase/functions/customer-signup/index.ts');
    expect(signup).toContain('if(kind==="customer")');
    expect(signup).toContain('requires_admin_approval:kind!=="customer"');
    expect(signup).not.toMatch(/role:\"customer\"[^\n]*kind===(?:\"merchant\"|\"driver\")/);
  });

  it('keeps the auth trigger approval-aware for merchant and driver registrations',()=>{
    const migration=text('supabase/migrations/202609070020_approval_aware_auth_user_trigger.sql');
    expect(migration).toContain("if v_registration_kind = 'customer' then");
    expect(migration).toContain("elsif v_registration_kind not in ('merchant','driver') then");
    expect(migration).toContain("set search_path = ''");
  });

  it('uses only Android SecureStore-safe characters for the reauth marker',()=>{
    const auth=text('src/lib/auth.ts');
    const match=auth.match(/REAUTH_AT_KEY='([^']+)'/);
    expect(match?.[1]).toBeTruthy();
    expect(match?.[1]).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('clears cached role data when the signed-in account changes',()=>{
    const providers=text('src/providers/AppProviders.tsx');
    expect(providers).toContain('queryClient.clear()');
    expect(providers).toContain('lastUserId.current!==nextId');
  });

  it('keeps required merchant and driver verification documents wired end to end',()=>{
    const onboarding=text('src/lib/onboarding.ts');
    const migration=text('supabase/migrations/202609131650_expand_onboarding_verification_documents.sql');
    for(const column of ['national_id_front_path','national_id_back_path']){
      expect(onboarding).toContain(column);
      expect(migration).toContain(column);
    }
    expect(onboarding).toContain('commercial_registration_path');
    expect(onboarding).toContain('driving_license_front_path');
    expect(onboarding).toContain('vehicle_license_front_path');
  });

  it('submits onboarding applications through authenticated server RPCs',()=>{
    const onboarding=text('src/lib/onboarding.ts');
    const migration=text('supabase/migrations/202609131945_secure_application_submission_rpcs.sql');
    expect(onboarding).toContain("supabase.rpc('submit_merchant_application'");
    expect(onboarding).toContain("supabase.rpc('submit_driver_application'");
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.submit_merchant_application");
    expect(migration).toContain("grant execute on function public.submit_driver_application");
  });

  it('keeps adhkar reminders selectable from one to fifteen minutes',()=>{
    const adhkar=text('src/lib/adhkar.ts');
    const screen=text('app/adhkar.tsx');
    expect(adhkar).toContain('Math.min(15,Math.max(1');
    expect(adhkar).toContain('TIME_INTERVAL');
    expect(screen).toContain('Array.from({length:15}');
  });

  it('breaks the orders and driver_status RLS cycle with definer helpers',()=>{
    const migration=text('supabase/migrations/202609131715_break_orders_driver_status_rls_cycle.sql');
    expect(migration).toContain('current_driver_is_online()');
    expect(migration).toContain('customer_can_read_driver_status');
    expect(migration).not.toMatch(/from public\.driver_status ds[\s\S]*create policy orders_read[\s\S]*exists \([\s\S]*from public\.driver_status/i);
  });

  it('scopes private store contacts to the same order store',()=>{
    const migration=text('supabase/migrations/202609131720_fix_store_private_contacts_order_scope.sql');
    expect(migration).toContain('o.store_id = store_private_contacts.store_id');
    expect(migration).not.toContain('o.store_id = o.store_id');
  });

  it('keeps admin dashboard focused and routes heavy controls to dedicated screens',()=>{
    const dashboard=text('app/admin/index.tsx');
    const layout=text('app/admin/_layout.tsx');
    expect(dashboard).toContain("router.push('/admin/operations')");
    expect(dashboard).toContain("router.push('/admin/applications')");
    expect(dashboard).toContain("router.push('/admin/commerce')");
    expect(dashboard).not.toContain('updateCommercialSettings');
    expect(dashboard).not.toContain('updateAdPlacement');
    expect(layout).toContain('طلبات الاعتماد');
    expect(layout).toContain('التشغيل والمستخدمون');
    expect(layout).toContain('الاشتراكات والإعلانات');
  });

  it('keeps technical route names out of the customer home header',()=>{
    const layout=text('app/_layout.tsx');
    const home=text('app/home.tsx');
    expect(layout).toContain('<Stack.Screen name="home" options={{ headerShown: false }} />');
    expect(home).toContain('أهلاً، {displayName}');
    expect(home).toContain('assets/app-icon.png');
  });
});
