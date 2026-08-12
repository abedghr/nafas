import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, HeroCard, StatTile, SectionHeader, Button, Chip, EmptyState } from '@/components/ui';
import { restaurantsApi, type ApiRestaurant } from '@/src/features/restaurants/api';

export default function RestaurantProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [r, setR] = useState<ApiRestaurant | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [reserved, setReserved] = useState(false);

  useEffect(() => {
    let active = true;
    if (!id) return;
    restaurantsApi.get(String(id))
      .then(d => { if (active) { setR(d); setStatus('ok'); } })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const handleCall = () => { if (r?.phone) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${r.phone}`); } };
  const handleDirections = () => {
    if (r?.lat == null || r?.lng == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`);
  };
  const handleReserve = () => {
    if (!r || reserved) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReserved(true);
    restaurantsApi.reserve(r.id, { partySize: 2 }).catch(() => setReserved(false));
  };

  const topPad = Platform.OS === 'web' ? 67 + 16 : insets.top + 8;

  if (status !== 'ok' || !r) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable onPress={back} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          {status === 'loading'
            ? <ActivityIndicator color={Colors.electric} />
            : <EmptyState icon="restaurant-outline" title={t('discover.not_found')} />}
        </View>
      </View>
    );
  }

  const cuisineLine = r.cuisines.filter(Boolean).join('  ·  ');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); back(); }}
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle} numberOfLines={1}>{r.name}</Display>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <HeroCard
            image={r.coverUrl ? { uri: r.coverUrl } : undefined}
            subtitle={cuisineLine || undefined}
            title={r.name}
            height={240}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.addressText, { color: theme.textSecondary }]}>{r.address}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(500)} style={styles.statRow}>
          <StatTile icon="star" color="#FFD700" value={String(r.rating)} label={t('discover.rating', { defaultValue: 'Rating' })} />
          {!!r.priceRange && (
            <StatTile icon="pricetag-outline" value={r.priceRange} label={t('discover.priceRange', { defaultValue: 'Price' })} />
          )}
        </Animated.View>

        {!!r.workingHours && (
          <Animated.View
            entering={FadeInDown.delay(180).duration(500)}
            style={[styles.hoursCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.hoursIcon, { backgroundColor: Colors.electric + '18' }]}>
              <Ionicons name="time-outline" size={18} color={Colors.electric} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.hoursLabel, { color: theme.textMuted }]}>{t('discover.working_hours')}</Text>
              <Text style={[styles.hoursValue, { color: theme.text }]}>{r.workingHours}</Text>
            </View>
          </Animated.View>
        )}

        {(r.lat != null && r.lng != null) || r.phone ? (
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.actionRow}>
            {r.lat != null && r.lng != null && (
              <Button variant="ghost" icon="navigate-outline" label={t('discover.directions')} onPress={handleDirections} style={styles.actionBtn} />
            )}
            {!!r.phone && (
              <Button variant="ghost" icon="call-outline" label={t('discover.call')} onPress={handleCall} style={styles.actionBtn} />
            )}
          </Animated.View>
        ) : null}

        {!!r.description && (
          <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.section}>
            <SectionHeader title={t('discover.about', { defaultValue: 'About' })} />
            <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{r.description}</Text>
          </Animated.View>
        )}

        {r.menu.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.section}>
            <SectionHeader title={t('discover.menu')} />
            <View style={styles.menuList}>
              {r.menu.map((m, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.delay(360 + i * 60).duration(400)}
                  style={[styles.menuCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuName, { color: theme.text }]}>{m.name}</Text>
                    {!!m.description && <Text style={[styles.menuDesc, { color: theme.textMuted }]} numberOfLines={2}>{m.description}</Text>}
                    {m.calories != null && (
                      <View style={[styles.calPill, { backgroundColor: Colors.electric + '18' }]}>
                        <Ionicons name="flame-outline" size={11} color={Colors.electric} />
                        <Text style={[styles.calText, { color: Colors.electric }]}>{m.calories} {t('nutrition.kcal')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.menuPrice, { color: theme.text }]}>{m.price.amount} {m.price.currency}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        <Button
          variant="solid"
          icon={reserved ? 'checkmark' : 'calendar-outline'}
          label={reserved ? t('discover.request_sent') : t('discover.reserve')}
          onPress={handleReserve}
          disabled={reserved}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headerTitle: { flex: 1, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  addressText: { fontFamily: Fonts.regular, fontSize: 14, flex: 1 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  hoursCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginTop: 10, borderWidth: 1 },
  hoursIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hoursLabel: { fontFamily: Fonts.medium, fontSize: 11 },
  hoursValue: { fontFamily: Fonts.semibold, fontSize: 15, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1 },
  section: { marginTop: 24 },
  descriptionText: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 22 },
  menuList: { gap: 10 },
  menuCard: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderRadius: 18, padding: 16, borderWidth: 1 },
  menuName: { fontFamily: Fonts.semibold, fontSize: 15 },
  menuDesc: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 3, lineHeight: 17 },
  calPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 8, paddingHorizontal: 10, height: 24, borderRadius: 999 },
  calText: { fontFamily: Fonts.semibold, fontSize: 11 },
  menuPrice: { fontFamily: Fonts.monoBold, fontSize: 15 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
