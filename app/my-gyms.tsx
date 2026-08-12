import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, EmptyState } from '@/components/ui';
import { gymsApi, type MyGym } from '@/src/features/gyms/api';

// Photo-led brand fallback (matches PhotoTile) when a gym has no cover image.
const TILE_GRADIENT = ['#1A3A30', '#0C201A'] as const;

export default function MyGymsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [items, setItems] = useState<MyGym[]>([]);
  const [status, setStatus] = useState<'loading' | 'ok'>('loading');

  useEffect(() => {
    let active = true;
    gymsApi.myGyms().then(d => { if (active) { setItems(d); setStatus('ok'); } }).catch(() => active && setStatus('ok'));
    return () => { active = false; };
  }, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const badge = (it: MyGym) => {
    if (it.kind === 'request') return { text: t('discover.pending'), color: theme.textMuted, bg: 'rgba(5,10,8,0.55)' };
    if (it.status === 'active') return { text: t('discover.active'), color: Colors.electric, bg: Colors.electric + '22' };
    return { text: it.status, color: theme.textMuted, bg: 'rgba(5,10,8,0.55)' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('discover.my_gyms')}</Display>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.gymId}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const b = badge(item);
          const gym = item.gym;
          const loc = gym.city || gym.address;
          return (
            <Animated.View entering={FadeInDown.delay(index * 70).duration(450)}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/gym-profile/${item.gymId}` as any); }}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}>
                {gym.coverUrl ? (
                  <Image source={{ uri: gym.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                ) : (
                  <LinearGradient colors={TILE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(5,10,8,0.86)']} style={StyleSheet.absoluteFill} />

                <View style={[styles.statusBadge, { backgroundColor: b.bg }]}>
                  <Text style={[styles.statusText, { color: b.color }]} numberOfLines={1}>{b.text}</Text>
                </View>

                <View style={styles.cardBody}>
                  <Display variant="d3" color="#fff" numberOfLines={1}>{gym.name}</Display>
                  <View style={styles.metaRow}>
                    <View style={styles.pill}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.pillText}>{gym.rating}</Text>
                    </View>
                    {!!loc && (
                      <View style={[styles.pill, { flexShrink: 1 }]}>
                        <Ionicons name="location-outline" size={12} color="#fff" />
                        <Text style={styles.pillText} numberOfLines={1}>{loc}{item.plan ? ` · ${item.plan}` : ''}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={status === 'ok' ? (
          <Animated.View entering={FadeInDown.delay(120).duration(450)}>
            <EmptyState icon="barbell-outline" title={t('discover.no_my_gyms')} />
          </Animated.View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { height: 148, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 12, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold, letterSpacing: 0.3 },
  cardBody: { padding: 16, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingHorizontal: 10, height: 26 },
  pillText: { fontFamily: Fonts.semibold, fontSize: 12, color: '#fff' },
});
