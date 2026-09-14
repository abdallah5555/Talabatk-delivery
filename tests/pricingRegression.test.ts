import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

describe('delivery pricing regression guard',()=>{
  it('keeps pricing admin and checkout quote surfaces present',()=>{
    expect(existsSync(new URL('../app/admin/pricing.tsx',import.meta.url))).toBe(true);
    const admin=read('app/admin/index.tsx');
    const checkout=read('app/checkout.tsx');
    expect(admin).toContain("router.push('/admin/pricing')");
    expect(checkout).toContain('getDeliveryQuote');
    expect(checkout).toContain('سعر التوصيل قبل التأكيد');
  });

  it('keeps delivery pricing server-authoritative and auditable',()=>{
    const migration=read('supabase/migrations/202609141515_delivery_pricing_engine_v1.sql');
    expect(migration).toContain('calculate_delivery_quote');
    expect(migration).toContain('security definer');
    expect(migration).toContain('delivery_base_fee');
    expect(migration).toContain('delivery_per_extra_km');
    expect(migration).toContain('delivery_per_minute');
    expect(migration).toContain('delivery_max_service_km');
    expect(migration).toContain('pricing_details jsonb');
    expect(migration).toContain("'distance_time_upfront_v1'");
    expect(migration).toContain("'safe_fallback'");
  });

  it('prices from the first kilometer instead of forcing a three-kilometer block',()=>{
    const rebalance=read('supabase/migrations/202609141640_rebalance_delivery_pricing_per_km.sql');
    const client=read('src/lib/pricing.ts');
    const admin=read('app/admin/pricing.tsx');
    expect(rebalance).toContain('delivery_base_fee=0');
    expect(rebalance).toContain('delivery_min_fee=10');
    expect(rebalance).toContain('delivery_included_km=0');
    expect(rebalance).toContain('delivery_per_extra_km=10');
    expect(rebalance).toContain('delivery_per_minute=0.15');
    expect(rebalance).toContain('delivery_road_factor=1.10');
    expect(rebalance).toContain('delivery_round_step=1');
    expect(client).toContain('delivery_per_extra_km??10');
    expect(client).toContain('delivery_per_minute??0.15');
    expect(admin).toContain('10 جنيه لكل كم من أول كيلومتر');
  });

  it('preserves driver pay when a customer redeems free delivery',()=>{
    const pricing=read('supabase/migrations/202609141515_delivery_pricing_engine_v1.sql');
    const settlement=read('supabase/migrations/202609141520_delivery_pricing_finance_snapshot_fix.sql');
    expect(pricing).toContain('driver_fee_snapshot');
    expect(pricing).toContain('if v_redemption is not null then v_fee:=0');
    expect(pricing).toContain('v_driver_fee:=q.driver_gross_fee');
    expect(settlement).toContain('coalesce(NEW.driver_fee_snapshot,NEW.quoted_delivery_fee,NEW.delivery_fee,0)');
  });

  it('keeps pricing parameters admin-only and validated',()=>{
    const migration=read('supabase/migrations/202609141515_delivery_pricing_engine_v1.sql');
    const client=read('src/lib/pricing.ts');
    expect(migration).toContain('admin_update_delivery_pricing');
    expect(migration).toContain("not public.has_role('admin')");
    expect(migration).toContain('Invalid delivery pricing settings');
    expect(client).toContain("supabase.rpc('admin_update_delivery_pricing'");
    expect(client).toContain("supabase.rpc('calculate_delivery_quote'");
  });
});
