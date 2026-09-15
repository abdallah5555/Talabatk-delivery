import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('account organization and first registration flow',()=>{
  it('keeps customer destinations grouped under a clear customer section',()=>{
    const account=text('app/account.tsx');
    expect(account).toContain('حساب العميل');
    expect(account).toContain('طلباتي');
    expect(account).toContain('عناويني');
    expect(account).toContain('المفضلة');
    expect(account).toContain('النقاط والمكافآت');
    expect(account).toContain('بيانات الحساب والخصوصية');
    expect(account).toContain("onPress={()=>router.push('/profile')}");
  });

  it('makes merchant and driver documents part of the first registration journey',()=>{
    const signup=text('app/signup.tsx');
    const onboarding=text('app/onboarding.tsx');
    expect(signup).toContain('تسجيلك كامل من أول مرة');
    expect(signup).toContain('المستندات المطلوبة');
    expect(signup).toContain('التالي: بيانات النشاط والمستندات');
    expect(signup).toContain('التالي: بيانات المندوب والمستندات');
    expect(signup).toContain("registration:'first'");
    expect(onboarding).toContain('requiredDocsComplete');
    expect(onboarding).toContain('identityComplete');
    expect(onboarding).toContain('motorcycleComplete');
    expect(onboarding).toContain('commercialRegistration');
    expect(onboarding).toContain('drivingFront');
    expect(onboarding).toContain('vehicleFront');
  });
});
