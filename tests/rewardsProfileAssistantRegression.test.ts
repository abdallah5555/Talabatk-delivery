import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const text=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('role rewards, referral, wallet and assistant regressions',()=>{
  it('keeps assistant composer keyboard-aware and customer copy clean',()=>{
    const assistant=text('app/assistant.tsx');
    expect(assistant).toContain('KeyboardAvoidingView');
    expect(assistant).toContain('behavior="padding"');
    expect(assistant).toContain("Platform.OS==='ios'?'interactive':'on-drag'");
    expect(assistant).not.toContain('بدون اشتراك AI');
    expect(assistant).not.toContain('AI مدفوع');
    expect(assistant).not.toContain("position:'absolute'");
  });

  it('accepts referral only during first signup with a fixed visible reward',()=>{
    const signup=text('app/signup.tsx');
    const auth=text('src/lib/auth.ts');
    const rewards=text('app/rewards.tsx');
    const profile=text('app/profile.tsx');
    const migration=text('supabase/migrations/202609141700_role_scoped_rewards_referral_and_driver_subsidy_wallet.sql');
    expect(signup).toContain('وقت إنشاء الحساب لأول مرة');
    expect(signup).toContain('50 نقطة');
    expect(auth).toContain('referralCode');
    expect(rewards).not.toContain('claimReferralCode');
    expect(rewards).not.toContain('قيمة مكافأة الدعوة بيحددها الأدمن');
    expect(profile).not.toContain('كود دعوتك');
    expect(profile).not.toContain('referralCode');
    expect(migration).toContain('reward_points constant integer := 50');
    expect(migration).toContain('referral code is registration-only');
  });

  it('keeps reward explanation and catalog scoped by active role',()=>{
    const rewards=text('app/rewards.tsx');
    const lib=text('src/lib/rewards.ts');
    const account=text('app/account.tsx');
    const roles=text('app/role/[role].tsx');
    expect(rewards).toContain("type RewardRole");
    expect(rewards).not.toContain('النقاط لكل أنواع الحسابات');
    expect(lib).toContain('getRewardCatalog(role:RewardRole)');
    expect(lib).toContain(".in('target_role',[role,'all'])");
    expect(account).toContain("params:{role:'customer'}");
    expect(roles).toContain("params:{role:'driver'}");
    expect(roles).toContain("params:{role:'merchant'}");
  });

  it('credits driver wallet when customer delivery is subsidized',()=>{
    const migration=text('supabase/migrations/202609141700_role_scoped_rewards_referral_and_driver_subsidy_wallet.sql');
    const wallet=text('app/wallet.tsx');
    expect(migration).toContain('subsidy_credit:=round(greatest(0,gross-customer_delivery_paid),2)');
    expect(migration).toContain("'delivery_subsidy_credit'");
    expect(wallet).toContain("delivery_subsidy_credit:'رصيد توصيل مدفوع من طلباتك'");
    expect(wallet).toContain('لو العميل استخدم مكافأة توصيل مجاني');
  });

  it('does not expose referral reward tuning in the admin UI',()=>{
    const admin=text('app/admin/finance.tsx');
    const finance=text('src/lib/finance.ts');
    expect(admin).not.toContain('نقاط دعوة الصديق');
    expect(admin).not.toContain('referralPts');
    expect(finance).toContain('p_referral_points:50');
  });

  it('keeps customer profile recoverable and links customer account tools',()=>{
    const profile=text('app/profile.tsx');
    expect(profile).toContain('query.refetch()');
    expect(profile).toContain('KeyboardAvoidingView');
    expect(profile).toContain('getOnboardingIdentity');
    expect(profile).toContain("params:{role:'customer'}");
    expect(profile).toContain("router.push('/addresses')");
    expect(profile).toContain("router.push('/favorites')");
  });
});
