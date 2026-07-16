import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

interface MapMarkerData {
  id: string;
  type: 'gym' | 'restaurant' | 'event' | 'partner';
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  color: string;
  icon: string;
  onPress?: () => void;
}

interface NativeMapProps {
  markers: MapMarkerData[];
  isDark: boolean;
  onMarkerPress: (marker: MapMarkerData) => void;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

const getMarkerIcon = (type: string): string => {
  switch (type) {
    case 'gym': return 'barbell';
    case 'restaurant': return 'restaurant';
    case 'event': return 'trophy';
    case 'partner': return 'person';
    default: return 'location';
  }
};

export default function NativeMap({ markers, isDark, onMarkerPress, initialRegion }: NativeMapProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton={false}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
    >
      {markers.map(marker => (
        <Marker
          key={`${marker.type}-${marker.id}`}
          coordinate={{ latitude: marker.lat, longitude: marker.lng }}
          onPress={() => onMarkerPress(marker)}
        >
          <View style={[styles.markerContainer, { backgroundColor: marker.color }]}>
            <Ionicons name={getMarkerIcon(marker.type) as any} size={16} color="#FFFFFF" />
          </View>
          <View style={[styles.markerArrow, { borderTopColor: marker.color }]} />
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -2,
  },
});
