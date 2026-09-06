import { useEffect, useRef } from 'react';
import { Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

export function DriverMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const host = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!host.current || mapRef.current) return;
    const map = new Map({ container: host.current, style: MAP_STYLE, center: [longitude, latitude], zoom: 15, attributionControl: true });
    const marker = new Marker({ color: '#e8590c' }).setLngLat([longitude, latitude]).addTo(map);
    mapRef.current = map;
    markerRef.current = marker;
    return () => { marker.remove(); map.remove(); markerRef.current = null; mapRef.current = null; };
  }, []);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
    mapRef.current?.easeTo({ center: [longitude, latitude], duration: 600 });
  }, [latitude, longitude]);

  return <div ref={host} aria-label="خريطة موقع المندوب" style={{ height: 280, width: '100%', borderRadius: 18, overflow: 'hidden' }} />;
}
