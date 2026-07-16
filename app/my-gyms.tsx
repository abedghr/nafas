import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { gymsApi, type MyGym } from '@/src/features/gyms/api';

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
    if (it.kind === 'request') return { text: t('discover.pending'), color: theme.textMuted, bg: theme.card };
    if (it.status === 'active') return { text: t('discover.active'), color: Colors.primary, bg: Colors.primary + '18' };
    return { text: it.status, color: theme.textMuted, bg: theme.card };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.my_gyms')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.gymId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const b = badge(item);
          return (
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/gym-profile/${item.gymId}` as any); }}
              style={({ pressed }) => [styles.card, { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 }]}>
              <View style={[styles.thumb, { backgroundColor: Colors.primary + '18' }]}>
                <Ionicons name="barbell-outline" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.gym.name}</Text>
                <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.gym.city || item.gym.address}{item.plan ? ` · ${item.plan}` : ''}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: b.bg }]}>
                <Text style={[styles.badgeText, { color: b.color }]}>{b.text}</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={status === 'ok' ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>{t('discover.no_my_gyms')}</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  thumb: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
});
