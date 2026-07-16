import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
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

  const chip = (s: string) => s === 'approved' ? { c: Colors.primary, bg: Colors.primary + '20' } : s === 'rejected' ? { c: Colors.accent, bg: Colors.accent + '20' } : { c: theme.textMuted, bg: '#FFD93D20' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.gym_leads')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {leads.length === 0 && <Text style={[styles.empty, { color: theme.textMuted }]}>{t('discover.no_leads')}</Text>}
        {leads.map((l) => {
          const cs = chip(l.status);
          return (
            <View key={l.id} style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.text }]}>{l.userName}</Text>
                  <Text style={[styles.sub, { color: theme.textMuted }]}>{l.gymName}{l.plan ? ` · ${l.plan}` : ''}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: cs.bg }]}><Text style={[styles.statusText, { color: cs.c }]}>{t(`discover.${l.status === 'pending' ? 'new_lead' : l.status === 'approved' ? 'active' : 'closed'}`)}</Text></View>
              </View>
              <View style={styles.actions}>
                {!!l.userPhone && <Pressable onPress={() => Linking.openURL(`tel:${l.userPhone}`)} style={[styles.btn, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /><Text style={[styles.btnText, { color: theme.text }]}>{t('discover.call')}</Text></Pressable>}
                {!!l.userPhone && <Pressable onPress={() => Linking.openURL(`https://wa.me/${l.userPhone!.replace(/[^0-9]/g, '')}`)} style={[styles.btn, { borderColor: '#25D36680' }]}><Ionicons name="logo-whatsapp" size={14} color="#25D366" /><Text style={[styles.btnText, { color: '#25D366' }]}>{t('discover.whatsapp')}</Text></Pressable>}
                {l.status === 'pending' && <Pressable onPress={() => setStatus(l.id, 'approved')} style={[styles.btn, { borderColor: Colors.primary }]}><Text style={[styles.btnText, { color: Colors.primary }]}>{t('discover.approve')}</Text></Pressable>}
                {l.status === 'pending' && <Pressable onPress={() => setStatus(l.id, 'rejected')} style={[styles.btn, { borderColor: theme.border }]}><Text style={[styles.btnText, { color: theme.textMuted }]}>{t('discover.reject')}</Text></Pressable>}
              </View>
            </View>
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
  card: { borderRadius: 14, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  btnText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
});
