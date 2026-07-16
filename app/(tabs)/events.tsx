import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, TextInput, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { gymsApi, type ApiGym } from '@/src/features/gyms/api';
import { restaurantsApi, type ApiRestaurant } from '@/src/features/restaurants/api';
import { coachesApi, type ApiCoach } from '@/src/features/coaches/api';
import { eventsApi, type ApiEvent } from '@/src/features/events/api';
import { isEnabled } from '@/lib/features';

type Mode = 'gyms' | 'restaurants' | 'coaches' | 'events';

const fmtDate = (iso: string | null) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch { return ''; }
};

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [mode, setMode] = useState<Mode>('gyms');
  const [search, setSearch] = useState('');
  const [gyms, setGyms] = useState<ApiGym[]>([]);
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [coaches, setCoaches] = useState<ApiCoach[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const segments: Mode[] = [
    'gyms',
    ...(isEnabled('restaurants') ? ['restaurants' as const] : []),
    ...(isEnabled('marketplace') ? ['coaches' as const] : []),
    ...(isEnabled('events') ? ['events' as const] : []),
  ];

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const id = setTimeout(() => {
      const q = { search: search || undefined, perPage: 50 };
      if (mode === 'gyms') gymsApi.list(q).then(r => { if (active) { setGyms(r.data); setStatus('ok'); } }).catch(() => active && setStatus('error'));
      else if (mode === 'restaurants') restaurantsApi.list(q).then(r => { if (active) { setRestaurants(r.data); setStatus('ok'); } }).catch(() => active && setStatus('error'));
      else if (mode === 'events') eventsApi.list({ search: search || undefined }).then(r => { if (active) { setEvents(r.data); setStatus('ok'); } }).catch(() => active && setStatus('error'));
      else coachesApi.list(q).then(r => { if (active) { setCoaches(r.data); setStatus('ok'); } }).catch(() => active && setStatus('error'));
    }, 200);
    return () => { active = false; clearTimeout(id); };
  }, [search, mode]);

  const open = (path: string) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(path as any); };

  const renderCard = (logo: string | null, name: string, sub: string, tags: string[], priceText: string | null, rating: number | null, onPress: () => void, index: number) => (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 }]}>
        {logo ? <Image source={{ uri: logo }} style={styles.thumb} resizeMode="cover" /> : (
          <View style={[styles.thumb, { backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={segIcon(mode) as any} size={26} color={Colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>{sub}</Text>
          </View>
          <View style={styles.tagRow}>
            {tags.slice(0, 3).map(ty => (
              <View key={ty} style={[styles.tag, { backgroundColor: theme.background }]}>
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>{ty}</Text>
              </View>
            ))}
          </View>
          {priceText && <Text style={[styles.fromText, { color: Colors.primary }]}>{priceText}</Text>}
        </View>
        {rating != null && (
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={13} color="#FFD93D" />
            <Text style={[styles.ratingText, { color: theme.text }]}>{rating}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );

  const data: any[] = mode === 'gyms' ? gyms : mode === 'restaurants' ? restaurants : mode === 'events' ? events : coaches;
  const segIcon = (m: Mode) => m === 'gyms' ? 'barbell-outline' : m === 'restaurants' ? 'restaurant-outline' : m === 'events' ? 'trophy-outline' : 'person-outline';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 12 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t('discover.title')}</Text>
          {mode === 'gyms' && (
            <Pressable onPress={() => router.push('/my-gyms' as any)} style={[styles.myGymsBtn, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="bookmark" size={14} color={Colors.primary} />
              <Text style={[styles.myGymsText, { color: Colors.primary }]}>{t('discover.my_gyms')}</Text>
            </Pressable>
          )}
          {mode === 'events' && (
            <Pressable onPress={() => router.push('/my-events' as any)} style={[styles.myGymsBtn, { backgroundColor: Colors.primary + '18' }]}>
              <Ionicons name="bookmark" size={14} color={Colors.primary} />
              <Text style={[styles.myGymsText, { color: Colors.primary }]}>{t('discover.my_events')}</Text>
            </Pressable>
          )}
        </View>

        {/* segment: gyms | restaurants | coaches */}
        <View style={[styles.segment, { backgroundColor: theme.card }]}>
          {segments.map(m => (
            <Pressable key={m} onPress={() => { setMode(m); setSearch(''); Haptics.selectionAsync(); }}
              style={[styles.segmentBtn, mode === m && { backgroundColor: Colors.primary }]}>
              <Ionicons name={segIcon(m) as any} size={15} color={mode === m ? '#fff' : theme.textMuted} />
              <Text style={[styles.segmentText, { color: mode === m ? '#fff' : theme.textMuted }]}>{t(`discover.${m}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t(mode === 'gyms' ? 'discover.search_gyms' : mode === 'restaurants' ? 'discover.search_restaurants' : mode === 'events' ? 'discover.search_events' : 'discover.search_coaches')}
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={theme.textMuted} /></Pressable>}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) =>
          mode === 'gyms'
            ? renderCard(item.logoUrl, item.name, item.city || item.address, item.types,
                item.subscriptions?.[0]?.price ? `${t('discover.from')} ${item.subscriptions[0].price.amount} ${item.subscriptions[0].price.currency}` : null,
                item.rating, () => open(`/gym-profile/${item.id}`), index)
            : mode === 'restaurants'
            ? renderCard(item.logoUrl, item.name, item.city || item.address, item.cuisines,
                item.priceRange, item.rating, () => open(`/restaurant-profile/${item.id}`), index)
            : mode === 'events'
            ? renderCard(item.logoUrl, item.name, [item.city, fmtDate(item.startsAt)].filter(Boolean).join(' · '), item.tags,
                t(`discover.event_type_${item.type}`), null, () => open(`/event-profile/${item.id}`), index)
            : renderCard(item.avatarUrl, item.name, item.headline, item.specialty,
                item.pricePerSession ? `${item.pricePerSession.amount} ${item.pricePerSession.currency} ${t('discover.per_session')}` : null,
                item.rating, () => open(`/coach-profile/${item.id}`), index)
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name={status === 'loading' ? 'time-outline' : (segIcon(mode) as any)} size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {status === 'loading' ? t('nutrition.loading') : t(mode === 'gyms' ? 'discover.no_gyms' : mode === 'restaurants' ? 'discover.no_restaurants' : mode === 'events' ? 'discover.no_events' : 'discover.no_coaches')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontFamily: 'Rubik_700Bold' },
  myGymsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  myGymsText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  segment: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
  segmentText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, paddingHorizontal: 14, height: 48, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  thumb: { width: 56, height: 56, borderRadius: 14 },
  name: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText: { fontSize: 12, fontFamily: 'Rubik_400Regular', flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 5 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 10, fontFamily: 'Rubik_500Medium' },
  fromText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
});
