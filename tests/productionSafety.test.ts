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
});
