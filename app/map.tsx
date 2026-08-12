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
import { Fonts, Type } from '@/constants/typography';
import { Display } from '@/components/ui';
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
  All: Colors.electric,
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
          contentContainerStyle={[styles.webMapContent, { paddingTop: 148, paddingBottom: 100 }]}
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
            style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={[styles.titleContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="map" size={18} color={Colors.electric} />
            <Display variant="d3" color={theme.text} style={styles.headerTitle}>Explore Map</Display>
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
              const activeColor = FILTER_COLORS[filter];
              return (
                <Pressable
                  key={filter}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? activeColor : theme.card,
                      borderColor: isActive ? activeColor : theme.border,
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
                    color={isActive ? '#04120B' : theme.textSecondary}
                  />
                  <Text style={[
                    styles.filterText,
                    { color: isActive ? '#04120B' : theme.textSecondary },
                  ]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>

      {!isWeb && (
        <View style={[styles.legendContainer, { bottom: selectedMarker ? 220 : (insets.bottom + 16) }]}>
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
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <View style={styles.selectedRow}>
              <View style={[styles.selectedIconCircle, { backgroundColor: `${selectedMarker.color}20` }]}>
                <Ionicons name={getMarkerIcon(selectedMarker.type) as any} size={24} color={selectedMarker.color} />
              </View>
              <View style={styles.selectedInfo}>
                <Display variant="d3" color={theme.text} numberOfLines={1}>
                  {selectedMarker.title}
                </Display>
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
            </View>
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
    borderRadius: 16,
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
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  webMarkerSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  webTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  webTypeText: {
    fontFamily: Fonts.semibold,
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
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    marginTop: 2,
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
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  legendContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  legendCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
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
    ...Type.caption,
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
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  selectedIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInfo: {
    flex: 1,
    gap: 3,
  },
  selectedSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginTop: 4,
  },
  typeText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  goBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
