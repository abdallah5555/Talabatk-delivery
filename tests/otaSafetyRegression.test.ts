import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('OTA and reminder regressions',()=>{
  it('downloads OTA updates without forcing an in-process native reload',()=>{
    const ota=text('src/components/OtaUpdateBanner.tsx');
    expect(ota).toContain('fetchUpdateAsync');
    expect(ota).not.toContain('reloadAsync');
    expect(ota).toContain('التحديث جاهز');
    expect(ota).toContain('هيتطبق تلقائيًا أول مرة تفتح التطبيق بعدها');
  });

  it('avoids startup update races in standalone Android builds',()=>{
    const config=JSON.parse(text('app.json'));
    expect(config.expo.updates.checkAutomatically).toBe('NEVER');
    expect(config.expo.updates.requestHeaders?.['expo-channel-name']).toBe('production');
    expect(config.expo.android.versionCode).toBeGreaterThanOrEqual(10);
  });

  it('keeps adhkar notifications rotating through real dhikr and migrates old schedules',()=>{
    const adhkar=text('src/lib/adhkar.ts');
    const layout=text('app/_layout.tsx');
    expect(adhkar).toContain('adhkarReminderCycle');
    expect(adhkar).toContain('body:item.text');
    expect(adhkar).toContain('SchedulableTriggerInputTypes.DATE');
    expect(adhkar).toContain('getAllScheduledNotificationsAsync');
    expect(adhkar).toContain('لا إله إلا الله وحده لا شريك له');
    expect(adhkar).toContain('refreshAdhkarReminderScheduleIfNeeded');
    expect(layout).toContain('refreshAdhkarReminderScheduleIfNeeded');
  });

  it('loads account identity through the self-scoped profile summary RPC',()=>{
    const onboarding=text('src/lib/onboarding.ts');
    const account=text('app/account.tsx');
    expect(onboarding).toContain("supabase.rpc('get_my_profile_summary')");
    expect(account).toContain('profile.data?.full_name');
    expect(account).not.toContain('مستخدم طلباتك');
  });
});
