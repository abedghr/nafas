import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, TextInput, Platform, Image, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, Chip, HeroCard, EmptyState, Skeleton } from '@/components/ui';
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

  // Photo-led card: full-bleed image (brand-gradient fallback) + scrim + overlaid title/meta.
  const renderCard = (image: string | null, name: string, sub: string, tags: string[], priceText: string | null, rating: number | null, onPress: () => void, index: number) => (
    <Animated.View entering={FadeInDown.duration(320).delay(index * 45)}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.photoCard, { opacity: pressed ? 0.92 : 1 }]}>
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#1A3A30', '#0C201A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(5,10,8,0.86)']} style={StyleSheet.absoluteFill} />
        {rating != null && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD93D" />
            <Text style={styles.ratingBadgeText}>{rating}</Text>
          </View>
        )}
        <View style={styles.photoBody}>
          {tags.length > 0 && <Text style={styles.overline} numberOfLines={1}>{tags[0]}</Text>}
          <Display variant="d3" color="#fff" numberOfLines={2}>{name}</Display>
          <View style={styles.infoPillRow}>
            {!!sub && (
              <View style={styles.infoPill}>
                <Ionicons name="location-outline" size={12} color="#E6F5EE" />
                <Text style={styles.infoPillText} numberOfLines={1}>{sub}</Text>
              </View>
            )}
            {priceText && (
              <View style={[styles.infoPill, styles.pricePill]}>
                <Text style={styles.priceText} numberOfLines={1}>{priceText}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  const data: any[] = mode === 'gyms' ? gyms : mode === 'restaurants' ? restaurants : mode === 'events' ? events : coaches;
  const segIcon = (m: Mode) => m === 'gyms' ? 'barbell-outline' : m === 'restaurants' ? 'restaurant-outline' : m === 'events' ? 'trophy-outline' : 'person-outline';

  // Trending spotlight — the first result, shown only on the default (unsearched) browse view.
  const heroMeta = (item: any) => {
    if (mode === 'gyms') return { img: item.logoUrl as string | null, title: item.name as string, sub: item.city || item.address || '', path: `/gym-profile/${item.id}` };
    if (mode === 'restaurants') return { img: item.logoUrl as string | null, title: item.name as string, sub: item.city || item.address || '', path: `/restaurant-profile/${item.id}` };
    if (mode === 'events') return { img: (item.coverUrl || item.logoUrl) as string | null, title: item.name as string, sub: [item.city, fmtDate(item.startsAt)].filter(Boolean).join(' · '), path: `/event-profile/${item.id}` };
    return { img: item.avatarUrl as string | null, title: item.name as string, sub: item.headline as string, path: `/coach-profile/${item.id}` };
  };
  const showHero = !search && status === 'ok' && data.length > 0;
  const hero = showHero ? heroMeta(data[0]) : null;
  const listData = showHero ? data.slice(1) : data;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 12 }}>
        <View style={styles.header}>
          <Display variant="d2" color={theme.text}>{t('discover.title')}</Display>
          {mode === 'gyms' && (
            <Pressable onPress={() => router.push('/my-gyms' as any)} style={[styles.myGymsBtn, { backgroundColor: Colors.electric + '1A' }]}>
              <Ionicons name="bookmark" size={14} color={Colors.electric} />
              <Text style={[styles.myGymsText, { color: Colors.electric }]}>{t('discover.my_gyms')}</Text>
            </Pressable>
          )}
          {mode === 'events' && (
            <Pressable onPress={() => router.push('/my-events' as any)} style={[styles.myGymsBtn, { backgroundColor: Colors.electric + '1A' }]}>
              <Ionicons name="bookmark" size={14} color={Colors.electric} />
              <Text style={[styles.myGymsText, { color: Colors.electric }]}>{t('discover.my_events')}</Text>
            </Pressable>
          )}
        </View>

        {/* category rail: gyms | restaurants | coaches | events */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail}>
          {segments.map(m => (
            <Chip
              key={m}
              label={t(`discover.${m}`)}
              icon={segIcon(m) as any}
              active={mode === m}
              onPress={() => { setMode(m); setSearch(''); }}
            />
          ))}
        </ScrollView>

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
        data={listData}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={hero ? (
          <Animated.View entering={FadeInDown.duration(340)} style={styles.heroWrap}>
            <HeroCard
              image={hero.img ? { uri: hero.img } : undefined}
              subtitle={hero.sub || undefined}
              title={hero.title}
              height={210}
              onPress={() => open(hero.path)}
            />
          </Animated.View>
        ) : null}
        renderItem={({ item, index }) =>
          mode === 'gyms'
            ? renderCard(item.logoUrl, item.name, item.city || item.address, item.types,
                item.subscriptions?.[0]?.price ? `${t('discover.from')} ${item.subscriptions[0].price.amount} ${item.subscriptions[0].price.currency}` : null,
                item.rating, () => open(`/gym-profile/${item.id}`), index)
            : mode === 'restaurants'
            ? renderCard(item.logoUrl, item.name, item.city || item.address, item.cuisines,
                item.priceRange, item.rating, () => open(`/restaurant-profile/${item.id}`), index)
            : mode === 'events'
            ? renderCard(item.coverUrl || item.logoUrl, item.name, [item.city, fmtDate(item.startsAt)].filter(Boolean).join(' · '), item.tags,
                t(`discover.event_type_${item.type}`), null, () => open(`/event-profile/${item.id}`), index)
            : renderCard(item.avatarUrl, item.name, item.headline, item.specialty,
                item.pricePerSession ? `${item.pricePerSession.amount} ${item.pricePerSession.currency} ${t('discover.per_session')}` : null,
                item.rating, () => open(`/coach-profile/${item.id}`), index)
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          status === 'loading' ? (
            <View style={{ gap: 12 }}>
              {[0, 1, 2, 3].map(i => <Skeleton key={i} height={168} radius={20} />)}
            </View>
          ) : (
            <EmptyState
              icon={segIcon(mode) as any}
              title={t(mode === 'gyms' ? 'discover.no_gyms' : mode === 'restaurants' ? 'discover.no_restaurants' : mode === 'events' ? 'discover.no_events' : 'discover.no_coaches')}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  myGymsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  myGymsText: { fontSize: 12, fontFamily: Fonts.semibold },
  chipRail: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, paddingHorizontal: 14, height: 48, borderRadius: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: Fonts.regular },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },
  heroWrap: { marginBottom: 16 },
  photoCard: { height: 168, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  photoBody: { padding: 14, gap: 6 },
  overline: { fontFamily: Fonts.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: Colors.electric },
  infoPillRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, maxWidth: '72%' },
  infoPillText: { fontFamily: Fonts.medium, fontSize: 11, color: '#E6F5EE' },
  pricePill: { backgroundColor: Colors.electric },
  priceText: { fontFamily: Fonts.bold, fontSize: 11, color: '#04120B' },
  ratingBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  ratingBadgeText: { fontFamily: Fonts.bold, fontSize: 11, color: '#fff' },
});
