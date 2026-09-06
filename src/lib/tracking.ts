import { supabase } from './supabase';

export async function getDriverLocationForOrder(orderId: string) {
  const { data, error } = await supabase.rpc('get_order_driver_location', { p_order_id: orderId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.latitude == null || row.longitude == null) return null;
  return { latitude: Number(row.latitude), longitude: Number(row.longitude), updated_at: String(row.updated_at) };
}

export function subscribeToDriverLocation(driverId: string, onChange: (location: { latitude: number; longitude: number; updated_at: string }) => void) {
  const channel = supabase.channel(`driver-location:${driverId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_status', filter: `user_id=eq.${driverId}` }, (payload) => {
      const row = payload.new as Record<string, unknown>;
      if (row.latitude == null || row.longitude == null) return;
      onChange({ latitude: Number(row.latitude), longitude: Number(row.longitude), updated_at: String(row.updated_at ?? new Date().toISOString()) });
    })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
