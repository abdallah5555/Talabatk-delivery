-- Rebalance Cairo-local delivery pricing to charge from the first kilometer instead of a 3km minimum block.
-- Baseline: 10 EGP/km, 10 EGP minimum, small time allowance, conservative road-distance factor.
-- All values remain admin-configurable through the existing secure admin RPC.

alter table public.platform_commercial_settings
  alter column delivery_base_fee set default 0,
  alter column delivery_min_fee set default 10,
  alter column delivery_included_km set default 0,
  alter column delivery_per_extra_km set default 10,
  alter column delivery_per_minute set default 0.15,
  alter column delivery_road_factor set default 1.10,
  alter column delivery_avg_speed_kmh set default 20,
  alter column delivery_max_fee set default 200,
  alter column delivery_round_step set default 1;

update public.platform_commercial_settings
set delivery_pricing_enabled=true,
    delivery_base_fee=0,
    delivery_min_fee=10,
    delivery_included_km=0,
    delivery_per_extra_km=10,
    delivery_per_minute=0.15,
    delivery_road_factor=1.10,
    delivery_avg_speed_kmh=20,
    delivery_max_fee=200,
    delivery_round_step=1,
    updated_at=now()
where id='global';
