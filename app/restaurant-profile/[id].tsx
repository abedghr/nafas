import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
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

  if (status !== 'ok' || !r) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
          <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          {status === 'loading' ? <ActivityIndicator color={Colors.primary} /> : <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('discover.not_found')}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); back(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{r.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}>
        {!!r.coverUrl && <Image source={{ uri: r.coverUrl }} style={styles.cover} resizeMode="cover" />}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          {r.logoUrl ? <Image source={{ uri: r.logoUrl }} style={styles.avatarCircle} resizeMode="cover" /> : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="restaurant" size={34} color="#fff" />
            </LinearGradient>
          )}
          <Text style={[styles.name, { color: theme.text }]}>{r.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.addressText, { color: theme.textSecondary }]}>{r.address}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Ionicons name="star" size={14} color="#FFD700" /><Text style={[styles.metaText, { color: theme.text }]}>{r.rating}</Text></View>
            {!!r.priceRange && <><View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>{r.priceRange}</Text></>}
          </View>
          <View style={styles.actionRow}>
            {r.lat != null && r.lng != null && (
              <Pressable onPress={handleDirections} style={[styles.outlineBtn, { borderColor: Colors.primary }]}>
                <Ionicons name="navigate-outline" size={15} color={Colors.primary} />
                <Text style={[styles.outlineBtnText, { color: Colors.primary }]}>{t('discover.directions')}</Text>
              </Pressable>
            )}
            {!!r.phone && (
              <Pressable onPress={handleCall} style={[styles.outlineBtn, { borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={15} color={theme.text} />
                <Text style={[styles.outlineBtnText, { color: theme.text }]}>{t('discover.call')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {!!r.description && <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{r.description}</Text>}

        {!!r.workingHours && (
          <View style={[styles.hoursCard, { backgroundColor: theme.card }]}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={[styles.hoursValue, { color: theme.text }]}>{r.workingHours}</Text>
          </View>
        )}

        {r.menu.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.menu')}</Text>
            <View style={[styles.menuCard, { backgroundColor: theme.card }]}>
              {r.menu.map((m, i) => (
                <View key={i} style={[styles.menuRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.menuName, { color: theme.text }]}>{m.name}</Text>
                    {!!m.description && <Text style={[styles.menuDesc, { color: theme.textMuted }]} numberOfLines={1}>{m.description}</Text>}
                    {m.calories != null && <Text style={[styles.menuCals, { color: theme.textMuted }]}>{m.calories} {t('nutrition.kcal')}</Text>}
                  </View>
                  <Text style={[styles.menuPrice, { color: Colors.primary }]}>{m.price.amount} {m.price.currency}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        <Pressable onPress={handleReserve} style={styles.reserveBtn} disabled={reserved}>
          <LinearGradient colors={reserved ? ['#3a3a44', '#2a2a32'] : [Colors.primary, Colors.primaryDark]} style={styles.reserveGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name={reserved ? 'checkmark' : 'calendar-outline'} size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.reserveText}>{reserved ? t('discover.request_sent') : t('discover.reserve')}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  scrollContent: { paddingHorizontal: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Rubik_400Regular' },
  cover: { width: '100%', height: 150, borderRadius: 16, marginBottom: -32 },
  heroSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#0A0A0F' },
  name: { fontSize: 22, fontFamily: 'Rubik_700Bold', marginBottom: 8, textAlign: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  addressText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  outlineBtnText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  descriptionText: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 22, marginBottom: 16 },
  hoursCard: { borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursValue: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  sectionTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold', marginBottom: 12 },
  menuCard: { borderRadius: 14, paddingHorizontal: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  menuName: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  menuDesc: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  menuCals: { fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  menuPrice: { fontSize: 15, fontFamily: 'Rubik_700Bold' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  reserveBtn: { borderRadius: 14, overflow: 'hidden' },
  reserveGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  reserveText: { color: '#fff', fontSize: 17, fontFamily: 'Rubik_700Bold' },
});
