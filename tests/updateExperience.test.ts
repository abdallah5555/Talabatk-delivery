import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('update and reminder regressions',()=>{
  it('shows visible OTA download progress without forcing a native reload',()=>{
    const ota=text('src/components/OtaUpdateBanner.tsx');
    expect(ota).toContain('downloadProgress');
    expect(ota).toContain('جاري تنزيل التحديث');
    expect(ota).toContain('التحديث جاهز');
    expect(ota).toContain('fetchUpdateAsync');
    expect(ota).not.toContain('reloadAsync');
    expect(ota).not.toContain('reloadScreenOptions');
  });

  it('rotates all adhkar and rebuilds stale native schedules instead of repeating one text',()=>{
    const adhkar=text('src/lib/adhkar.ts');
    const page=text('app/adhkar.tsx');
    const layout=text('app/_layout.tsx');
    expect(adhkar).toContain('SCHEDULE_VERSION=5');
    expect(adhkar).toContain('adhkarReminderCycle');
    expect(adhkar).toContain('getAllScheduledNotificationsAsync');
    expect(adhkar).toContain('isAdhkarRequest');
    expect(adhkar).toContain('uniqueBodies');
    expect(adhkar).toContain('getAdhkarScheduleDiagnostics');
    expect(adhkar).toContain('SchedulableTriggerInputTypes.DATE');
    expect(adhkar).toContain('scheduleRotatingBatch');
    expect(adhkar).not.toContain('const reminderDhikr=');
    expect(page).toContain('REQUEST_SCHEDULE_EXACT_ALARM');
    expect(layout).toContain('AppState.addEventListener');
    expect(layout).toContain('refreshAdhkarReminderScheduleIfNeeded');
  });

  it('keeps legacy alias recovery display-only and self-scoped',()=>{
    const migration=text('supabase/migrations/202609132245_resolve_legacy_profile_alias_for_display.sql');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('auth.users');
    expect(migration).toContain('talabak\\.internal\\.net');
    expect(migration).toContain('grant execute on function public.get_my_profile_summary() to authenticated');
    expect(migration).not.toContain('user_roles');
  });
});
