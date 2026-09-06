import * as Location from 'expo-location';
import { updateDriverLocation } from './features';

export async function startDriverLocationUpdates(onUpdate?: (coords: { latitude: number; longitude: number; accuracy: number | null }) => void) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('لازم تسمح باستخدام الموقع أثناء الوردية.');

  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  await updateDriverLocation(current.coords.latitude, current.coords.longitude, current.coords.accuracy);
  onUpdate?.({ latitude: current.coords.latitude, longitude: current.coords.longitude, accuracy: current.coords.accuracy });

  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 10_000, distanceInterval: 20 },
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      void updateDriverLocation(latitude, longitude, accuracy).then(() => onUpdate?.({ latitude, longitude, accuracy })).catch(() => undefined);
    },
  );
  return () => subscription.remove();
}
