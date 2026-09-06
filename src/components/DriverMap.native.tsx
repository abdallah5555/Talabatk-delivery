import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { Text, View } from 'react-native';

const MAP_STYLE = process.env.EXPO_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

export function DriverMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return <View style={{ height: 280, borderRadius: 18, overflow: 'hidden' }}>
    <Map mapStyle={MAP_STYLE} style={{ flex: 1 }}>
      <Camera center={[longitude, latitude]} zoom={15} duration={600} easing="ease" />
      <Marker id="driver" lngLat={[longitude, latitude]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8590c', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>🛵</Text>
        </View>
      </Marker>
    </Map>
  </View>;
}
