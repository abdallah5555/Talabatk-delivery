import { describe, expect, it } from 'vitest';
import { buildAssistantReply } from '@/src/lib/assistant';
import { inferMarketplaceCategory, normalizeArabic } from '@/src/lib/marketplace';

describe('Talabatk assistant Arabic intent coverage',()=>{
  const cases:[string,string][]=[
    ['فين طلبي؟','order_status'],['الطلب وصل لفين','order_status'],['المندوب فين','driver_tracking'],['الغي الطلب','cancel_order'],['اطلب نفس الطلب تاني','reorder'],['هيوصل امتى','eta'],
    ['الطلب ناقص','missing_item'],['جالي منتج غلط','wrong_item'],['المنتج مكسور','damaged_item'],['الطلب اتأخر','late_order'],['عايز أكلم الدعم','support'],['عايز أكلم المندوب','driver_chat'],
    ['عايز أغير عنواني','addresses'],['افتح المفضلة','favorites'],['عايز أغير صورتي','profile'],['نسيت الباسورد وعايز الأمان','security'],['افتح الاشعارات','notifications'],['افتح الأذكار','adhkar'],
    ['ادفع ازاي','payment'],['عايز الطلب بعد ساعة','scheduled_order'],['عايز أفتح متجر','merchant_onboarding'],['عايز أشتغل مندوب','driver_onboarding'],
    ['عندكم خصومات','offers'],['فيه نقاط؟','loyalty'],['ازاي أعزم صاحبي','referral'],['بتوصلوا ايه','categories'],
  ];
  for(const [phrase,intent] of cases)it(`${phrase} -> ${intent}`,()=>expect(buildAssistantReply(phrase).intent).toBe(intent));

  it('turns shopping language into marketplace search',()=>{
    const reply=buildAssistantReply('عايز شاحن موبايل تحت 500 جنيه');
    expect(reply.intent).toBe('marketplace_search');
    expect(reply.action?.type).toBe('search');
    if(reply.action?.type==='search')expect(reply.action.maxPrice).toBe(500);
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
