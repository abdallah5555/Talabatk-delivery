import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inferMarketplaceCategory, normalizeArabic } from '../src/lib/marketplaceCore';

const assistant=readFileSync(new URL('../src/lib/assistant.ts',import.meta.url),'utf8');

describe('Talabatk assistant Arabic intent coverage',()=>{
  const cases:[string,string][]=[
    ['فين طلبي','order_status'],['المندوب فين','driver_tracking'],['الغي الطلب','cancel_order'],['اطلب تاني','reorder'],['هيوصل امتى','eta'],
    ['الطلب ناقص','missing_item'],['طلب غلط','wrong_item'],['مكسور','damaged_item'],['متأخر','late_order'],['اكلم الدعم','support'],['اكلم المندوب','driver_chat'],
    ['العنوان','addresses'],['المفضله','favorites'],['صورتي','profile'],['الباسورد','security'],['اشعارات','notifications'],['اذكار','adhkar'],
    ['ادفع ازاي','payment'],['طلب مجدول','scheduled_order'],['افتح متجر','merchant_onboarding'],['اشتغل مندوب','driver_onboarding'],
    ['خصم','offers'],['نقاط','loyalty'],['دعوه','referral'],['اقسام','categories'],
  ];
  for(const [phrase,intent] of cases)it(`keeps ${phrase} -> ${intent}`,()=>{
    expect(assistant).toContain(phrase);
    expect(assistant).toContain(`intent:'${intent}'`);
  });

  it('keeps shopping language routed to marketplace search',()=>{
    expect(assistant).toContain("intent:'marketplace_search'");
    expect(assistant).toContain("type:'search'");
    expect(assistant).toContain('maxPrice');
  });

  it('understands broad non-food marketplace categories',()=>{
    expect(inferMarketplaceCategory('صيدلية وأدوية')).toBe('pharmacy');
    expect(inferMarketplaceCategory('موبايلات وشواحن')).toBe('electronics');
    expect(inferMarketplaceCategory('قطع غيار سيارات')).toBe('auto');
    expect(inferMarketplaceCategory('ورد وهدايا')).toBe('gifts');
    expect(inferMarketplaceCategory('سباك وصيانة')).toBe('hardware');
  });

  it('normalizes common Arabic spelling differences',()=>{
    expect(normalizeArabic('إلكترونيات')).toBe(normalizeArabic('الكترونيات'));
    expect(normalizeArabic('صيدلية')).toContain('صيدليه');
  });
});
