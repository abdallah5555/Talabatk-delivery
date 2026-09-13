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

  it('refreshes old adhkar schedules after an OTA so legacy notification text disappears',()=>{
    const adhkar=text('src/lib/adhkar.ts');
    const layout=text('app/_layout.tsx');
    expect(adhkar).toContain('SCHEDULE_VERSION=3');
    expect(adhkar).toContain('refreshAdhkarReminderScheduleIfNeeded');
    expect(adhkar).toContain('seconds:interval*60');
    expect(adhkar).toContain('لا إله إلا الله وحده لا شريك له');
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
