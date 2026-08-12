import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, StatTile, CountUp, EmptyState } from '@/components/ui';
import { gymsApi, type GymLead } from '@/src/features/gyms/api';

export default function GymLeadsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [leads, setLeads] = useState<GymLead[]>([]);

  const load = () => gymsApi.ownerLeads().then(setLeads).catch(() => {});
  useEffect(() => { load(); }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const setStatus = async (id: string, status: string) => { await gymsApi.updateOwnerLead(id, status).catch(() => {}); load(); };

  const statusColor = (s: string) => s === 'approved' ? Colors.electric : s === 'rejected' ? Colors.semantic.danger : Colors.semantic.warn;

  const pending = leads.filter((l) => l.status === 'pending').length;
  const approved = leads.filter((l) => l.status === 'approved').length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 12 : insets.top + 12 }]}>
        <Pressable onPress={back} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('discover.gym_leads')}</Display>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {leads.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.summary}>
            <StatTile icon="people-outline" value={<CountUp value={leads.length} style={[styles.statVal, { color: theme.text }]} />} label={t('discover.gym_leads')} />
            <StatTile icon="sparkles-outline" color={Colors.semantic.warn} value={<CountUp value={pending} style={[styles.statVal, { color: theme.text }]} />} label={t('discover.new_lead')} />
            <StatTile icon="checkmark-circle-outline" color={Colors.electric} value={<CountUp value={approved} style={[styles.statVal, { color: theme.text }]} />} label={t('discover.active')} />
          </Animated.View>
        )}

        {leads.length === 0 && (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <EmptyState icon="people-outline" title={t('discover.no_leads')} />
          </Animated.View>
        )}

        {leads.map((l, i) => {
          const sc = statusColor(l.status);
          const initial = (l.userName?.trim()?.charAt(0) || '?').toUpperCase();
          return (
            <Animated.View key={l.id} entering={FadeInDown.delay(120 + i * 60).duration(500)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHead}>
                <View style={[styles.avatar, { backgroundColor: Colors.electric + '22' }]}>
                  <Text style={[styles.avatarText, { color: Colors.electric }]}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Type.h2, { color: theme.text }]} numberOfLines={1}>{l.userName}</Text>
                  <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>{l.gymName}{l.plan ? ` · ${l.plan}` : ''}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: sc + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc }]} />
                  <Text style={[styles.statusText, { color: sc }]}>{t(`discover.${l.status === 'pending' ? 'new_lead' : l.status === 'approved' ? 'active' : 'closed'}`)}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                {!!l.userPhone && <Pressable onPress={() => Linking.openURL(`tel:${l.userPhone}`)} style={[styles.pill, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /><Text style={[styles.pillText, { color: theme.text }]}>{t('discover.call')}</Text></Pressable>}
                {!!l.userPhone && <Pressable onPress={() => Linking.openURL(`https://wa.me/${l.userPhone!.replace(/[^0-9]/g, '')}`)} style={[styles.pill, { borderColor: '#25D36680' }]}><Ionicons name="logo-whatsapp" size={14} color="#25D366" /><Text style={[styles.pillText, { color: '#25D366' }]}>{t('discover.whatsapp')}</Text></Pressable>}
                {l.status === 'pending' && <Pressable onPress={() => setStatus(l.id, 'approved')} style={[styles.pill, styles.pillFilled, { backgroundColor: Colors.electric, borderColor: Colors.electric }]}><Ionicons name="checkmark" size={14} color="#04120B" /><Text style={[styles.pillText, { color: '#04120B' }]}>{t('discover.approve')}</Text></Pressable>}
                {l.status === 'pending' && <Pressable onPress={() => setStatus(l.id, 'rejected')} style={[styles.pill, { borderColor: theme.border }]}><Ionicons name="close" size={14} color={Colors.semantic.danger} /><Text style={[styles.pillText, { color: Colors.semantic.danger }]}>{t('discover.reject')}</Text></Pressable>}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  summary: { flexDirection: 'row', gap: 8 },
  statVal: { fontSize: 18 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.bold, fontSize: 18 },
  sub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 26, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.semibold, fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, height: 34 },
  pillFilled: { borderWidth: 1.5 },
  pillText: { fontFamily: Fonts.semibold, fontSize: 12 },
});
