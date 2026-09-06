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
    expect(sw).toContain('.supabase.co');
    expect(sw).toMatch(/supabase\.co[\s\S]{0,200}return fetch/i);
  });

  it('does not expose privileged secrets in the public env example',()=>{
    const env=text('.env.example');
    const liveLines=env.split(/\r?\n/).filter((line)=>line.trim()&&!line.trim().startsWith('#')).join('\n');
    expect(liveLines).not.toMatch(/SERVICE_ROLE/i);
    expect(liveLines).not.toMatch(/BOT_TOKEN/i);
    expect(liveLines).not.toMatch(/FCM.*PRIVATE|PRIVATE.*FCM/i);
  });
});
