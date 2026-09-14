import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('profile, map and OTA stability regressions',()=>{
  it('keeps OTA manual-only on the current production runtime',()=>{
    const app=JSON.parse(text('app.json')).expo;
    expect(app.version).toBe('0.1.7');
    expect(app.android.versionCode).toBe(13);
    expect(app.updates.checkAutomatically).toBe('NEVER');
    expect(text('src/components/OtaUpdateBanner.tsx')).not.toContain('reloadAsync');
  });

  it('uses a render-safe MapLibre v11 layer instead of ViewAnnotation for address selection',()=>{
    const addresses=text('app/addresses.tsx');
    expect(addresses).toContain('GeoJSONSource');
    expect(addresses).toContain('type="circle"');
    expect(addresses).not.toContain('ViewAnnotation');
    expect(addresses).not.toContain('flyTo');
  });

  it('exposes an editable self-owned customer profile',()=>{
    const account=text('app/account.tsx');
    const profile=text('app/profile.tsx');
    const migration=text('supabase/migrations/202609141000_customer_profile_details_and_avatar_storage.sql');
    expect(account).toContain("router.push('/profile')");
    expect(profile).toContain("supabase.rpc('update_my_profile_details'");
    expect(profile).toContain("supabase.storage.from('profile-avatars')");
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain("bucket_id='profile-avatars'");
  });
});
