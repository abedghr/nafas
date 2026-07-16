import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { eventsApi, type MyEvent } from '@/src/features/events/api';

const fmt = (iso: string | null) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

export default function MyEventsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [items, setItems] = useState<MyEvent[]>([]);

  useEffect(() => { eventsApi.mine().then(setItems).catch(() => {}); }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const chip = (s: string) => s === 'confirmed' ? { c: Colors.primary, bg: Colors.primary + '20', k: 'reg_confirmed' } : s === 'rejected' ? { c: Colors.accent, bg: Colors.accent + '20', k: 'rejected' } : { c: theme.textMuted, bg: '#FFD93D20', k: 'reg_pending' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.my_events')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 && <Text style={[styles.empty, { color: theme.textMuted }]}>{t('discover.no_my_events')}</Text>}
        {items.map((it) => {
          const cs = chip(it.status);
          return (
            <Pressable key={it.id} onPress={() => router.push(`/event-profile/${it.eventId}` as any)} style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{it.name}</Text>
                <Text style={[styles.sub, { color: theme.textMuted }]}>{[it.venue, fmt(it.startsAt)].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: cs.bg }]}><Text style={[styles.statusText, { color: cs.c }]}>{t(`discover.${cs.k}`)}</Text></View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { textAlign: 'center', paddingTop: 60, fontSize: 15, fontFamily: 'Rubik_500Medium' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 16 },
  name: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
});
