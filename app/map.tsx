import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { gyms, restaurants, tournaments, readyToTrainUsers, users } from '@/lib/mock-data';
import NativeMap from '@/components/NativeMap';

const RIYADH_REGION = {
  latitude: 24.7136,
  longitude: 46.6753,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const FILTERS = ['All', 'Gyms', 'Restaurants', 'Events', 'Partners'] as const;
type FilterType = typeof FILTERS[number];

const FILTER_ICONS: Record<FilterType, string> = {
  All: 'apps-outline',
  Gyms: 'barbell-outline',
  Restaurants: 'restaurant-outline',
  Events: 'trophy-outline',
  Partners: 'people-outline',
};

const FILTER_COLORS: Record<FilterType, string> = {
  All: Colors.primary,
  Gyms: '#4ECDC4',
  Restaurants: '#FF6B35',
  Events: '#FFD93D',
  Partners: '#00B4D8',
};

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

export default function MapScreen() {
  const { isDark } = useApp();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(null);

  const theme = isDark ? Colors.dark : Colors.light;
  const topPadding = Platform.OS === 'web' ? 67 + 8 : insets.top + 8;
  const isWeb = Platform.OS === 'web';

  const markers = useMemo(() => {
    const all: MapMarkerData[] = [];

    if (activeFilter === 'All' || activeFilter === 'Gyms') {
      gyms.forEach(g => {
        all.push({
          id: g.id, type: 'gym', title: g.name,
          subtitle: `${g.rating} ★ · ${g.distance}`,
          lat: g.lat, lng: g.lng, color: '#4ECDC4', icon: 'barbell',
          onPress: () => router.push(`/gym-profile/${g.id}` as any),
        });
      });
    }

    if (activeFilter === 'All' || activeFilter === 'Restaurants') {
      restaurants.forEach(r => {
        all.push({
          id: r.id, type: 'restaurant', title: r.name,
          subtitle: `${r.rating} ★ · ${r.distance}`,
          lat: r.lat, lng: r.lng, color: '#FF6B35', icon: 'restaurant',
          onPress: () => router.push(`/restaurant-profile/${r.id}` as any),
        });
      });
    }

    if (activeFilter === 'All' || activeFilter === 'Events') {
      tournaments.forEach(t => {
        all.push({
          id: t.id, type: 'event', title: t.name,
          subtitle: `${t.date} · ${t.registeredCount} registered`,
          lat: t.lat, lng: t.lng, color: '#FFD93D', icon: 'trophy',
        });
      });
    }

    if (activeFilter === 'All' || activeFilter === 'Partners') {
      readyToTrainUsers.forEach(rtu => {
        const u = users.find(us => us.id === rtu.userId);
        if (u) {
          all.push({
            id: rtu.userId, type: 'partner', title: u.name,
            subtitle: `${rtu.activity} · ${rtu.location}`,
            lat: rtu.lat, lng: rtu.lng, color: '#00B4D8', icon: 'person',
            onPress: () => router.push(`/user-profile/${u.id}` as any),
          });
        }
      });
    }

    return all;
  }, [activeFilter]);

  const handleMarkerPress = (marker: MapMarkerData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMarker(marker);
  };

  const handleCardPress = () => {
    if (selectedMarker?.onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      selectedMarker.onPress();
    }
  };

  const getMarkerIcon = (type: string): string => {
    switch (type) {
      case 'gym': return 'barbell';
      case 'restaurant': return 'restaurant';
      case 'event': return 'trophy';
      case 'partner': return 'person';
      default: return 'location';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {!isWeb ? (
        <NativeMap
          markers={markers}
          isDark={isDark}
          onMarkerPress={handleMarkerPress}
          initialRegion={RIYADH_REGION}
        />
      ) : (
        <ScrollView
          style={styles.webMapFallback}
          contentContainerStyle={[styles.webMapContent, { paddingTop: 140, paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {markers.map((marker) => (
            <Pressable
              key={`${marker.type}-${marker.id}`}
              style={[styles.webMarkerCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (marker.onPress) marker.onPress();
              }}
            >
              <View style={[styles.webMarkerIcon, { backgroundColor: `${marker.color}20` }]}>
                <Ionicons name={getMarkerIcon(marker.type) as any} size={20} color={marker.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.webMarkerTitle, { color: theme.text }]} numberOfLines={1}>{marker.title}</Text>
                <Text style={[styles.webMarkerSub, { color: theme.textSecondary }]} numberOfLines={1}>{marker.subtitle}</Text>
              </View>
              <View style={[styles.webTypeBadge, { backgroundColor: `${marker.color}20` }]}>
                <Text style={[styles.webTypeText, { color: marker.color }]}>
                  {marker.type.charAt(0).toUpperCase() + marker.type.slice(1)}
                </Text>
              </View>
              {marker.onPress && (
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              )}
            </Pressable>
          ))}
          <View style={styles.webMapNote}>
            <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.webMapNoteText, { color: theme.textMuted }]}>
              Interactive map available on mobile devices
            </Text>
          </View>
        </ScrollView>
      )}

      <View style={[styles.headerOverlay, { paddingTop: topPadding }]}>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: theme.card }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <View style={[styles.titleContainer, { backgroundColor: theme.card }]}>
            <Ionicons name="map" size={18} color={Colors.primary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>Explore Map</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTERS.map(filter => {
              const isActive = activeFilter === filter;
              return (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? FILTER_COLORS[filter] : theme.card,
                      borderColor: isActive ? FILTER_COLORS[filter] : theme.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveFilter(filter);
                    setSelectedMarker(null);
                  }}
                >
                  <Ionicons
                    name={FILTER_ICONS[filter] as any}
                    size={14}
                    color={isActive ? '#FFFFFF' : theme.textSecondary}
                  />
                  <Text style={[
                    styles.filterText,
                    { color: isActive ? '#FFFFFF' : theme.textSecondary },
                  ]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>

      {!isWeb && (
        <View style={[styles.legendContainer, { bottom: selectedMarker ? 200 : (insets.bottom + 16) }]}>
          <View style={[styles.legendCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {(['Gyms', 'Restaurants', 'Events', 'Partners'] as const).map(label => (
              <View key={label} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: FILTER_COLORS[label] }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedMarker && !isWeb && (
        <Animated.View
          entering={FadeInUp.springify()}
          style={[styles.selectedCardContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          <Pressable
            style={[styles.selectedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleCardPress}
          >
            <View style={[styles.selectedIconCircle, { backgroundColor: `${selectedMarker.color}20` }]}>
              <Ionicons name={getMarkerIcon(selectedMarker.type) as any} size={24} color={selectedMarker.color} />
            </View>
            <View style={styles.selectedInfo}>
              <Text style={[styles.selectedTitle, { color: theme.text }]} numberOfLines={1}>
                {selectedMarker.title}
              </Text>
              <Text style={[styles.selectedSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {selectedMarker.subtitle}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: `${selectedMarker.color}20` }]}>
                <Text style={[styles.typeText, { color: selectedMarker.color }]}>
                  {selectedMarker.type.charAt(0).toUpperCase() + selectedMarker.type.slice(1)}
                </Text>
              </View>
            </View>
            {selectedMarker.onPress && (
              <View style={[styles.goBtn, { backgroundColor: selectedMarker.color }]}>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
  },
  webMapContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  webMarkerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  webMarkerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMarkerTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 14,
  },
  webMarkerSub: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  webTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  webTypeText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 10,
  },
  webMapNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  webMapNoteText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 12,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 13,
  },
  legendContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  legendCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 11,
  },
  selectedCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    flex: 1,
    gap: 2,
  },
  selectedTitle: {
    fontFamily: 'Rubik_600SemiBold',
    fontSize: 16,
  },
  selectedSubtitle: {
    fontFamily: 'Rubik_400Regular',
    fontSize: 13,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  typeText: {
    fontFamily: 'Rubik_500Medium',
    fontSize: 11,
  },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
