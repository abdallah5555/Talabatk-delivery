import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('critical regression guard',()=>{
  it('keeps every critical product route present',()=>{
    const routes=[
      'app/index.tsx','app/login.tsx','app/signup.tsx','app/home.tsx','app/account.tsx','app/profile.tsx','app/search.tsx','app/assistant.tsx',
      'app/addresses.tsx','app/favorites.tsx','app/checkout.tsx','app/orders.tsx','app/order/[id].tsx',
      'app/onboarding.tsx','app/pending-approval.tsx','app/role/[role].tsx','app/store/[id].tsx',
      'app/admin/index.tsx','app/admin/applications.tsx','app/admin/operations.tsx','app/admin/commerce.tsx',
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
    for(const command of ['npm run doctor','npm run lint','npm run typecheck','npm run test','npm run test:backend-auth','npm run export:web','npm run e2e']){
      expect(ci).toContain(command);
    }
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
});
