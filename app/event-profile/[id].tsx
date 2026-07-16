import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { eventsApi, type ApiEvent } from '@/src/features/events/api';
import { classesApi, type ClassItem } from '@/src/features/gyms/api';

const fmt = (iso: string | null) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

export default function EventProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [ev, setEv] = useState<ApiEvent | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [myStatus, setMyStatus] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const loadClasses = () => { if (id) eventsApi.classes(String(id)).then(setClasses).catch(() => {}); };
  useEffect(() => {
    if (!id) return;
    eventsApi.get(String(id)).then(e => { setEv(e); setMyStatus(e.myStatus ?? null); setStatus('ok'); }).catch(() => setStatus('error'));
    loadClasses();
  }, [id]);

  const joinClass = (c: ClassItem) => {
    if (ev?.canManage) return; // you manage this — can't enroll
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (c.myStatus === 'pending' || c.myStatus === 'enrolled') {
      // cancel / roll back
      setClasses(cs => cs.map(x => x.id === c.id ? { ...x, myStatus: null } : x));
      classesApi.cancel(c.id).catch(loadClasses);
    } else {
      setClasses(cs => cs.map(x => x.id === c.id ? { ...x, myStatus: 'pending' } : x));
      classesApi.join(c.id).catch(loadClasses);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const directions = () => { if (ev?.lat != null && ev?.lng != null) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}`); };
  const register = () => {
    if (!ev || ev.canManage) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (myStatus === 'pending' || myStatus === 'confirmed') {
      const prev = myStatus; setMyStatus(null);
      eventsApi.cancelRegister(ev.id).catch(() => setMyStatus(prev));
    } else {
      setMyStatus('pending');
      eventsApi.register(ev.id).catch(() => setMyStatus(null));
    }
  };

  if (status !== 'ok' || !ev) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
        {status === 'loading' ? <ActivityIndicator color={Colors.primary} /> : <Text style={{ color: theme.textMuted }}>{t('discover.no_events')}</Text>}
      </View>
    );
  }

  const full = ev.capacity > 0 && ev.registeredCount >= ev.capacity;
  const manages = !!ev.canManage;
  const canCancel = myStatus === 'pending' || myStatus === 'confirmed';
  const label = manages ? t('discover.you_manage_event')
    : canCancel ? t('discover.cancel_registration')
    : myStatus === 'rejected' ? t('discover.rejected')
    : full ? t('discover.class_full') : t('discover.register');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{ev.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {ev.coverUrl ? <Image source={{ uri: ev.coverUrl }} style={styles.cover} /> : <View style={[styles.cover, { backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="trophy-outline" size={44} color={Colors.primary} /></View>}

        <View style={styles.body}>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: Colors.primary + '20' }]}><Text style={[styles.typeText, { color: Colors.primary }]}>{t(`discover.event_type_${ev.type}`)}</Text></View>
            {!!ev.category && <View style={[styles.typeBadge, { backgroundColor: theme.card }]}><Text style={[styles.typeText, { color: theme.textSecondary }]}>{ev.category}</Text></View>}
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{ev.name}</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /><Text style={[styles.infoText, { color: theme.text }]}>{fmt(ev.startsAt)}{ev.endsAt ? ` → ${fmt(ev.endsAt)}` : ''}</Text></View>
            <Pressable onPress={directions} style={styles.infoRow}><Ionicons name="location-outline" size={18} color={Colors.primary} /><Text style={[styles.infoText, { color: theme.text, flex: 1 }]}>{ev.venue}{ev.city ? `, ${ev.city}` : ''}</Text>{ev.lat != null && <Ionicons name="navigate-outline" size={16} color={Colors.primary} />}</Pressable>
            <View style={styles.infoRow}><Ionicons name="people-outline" size={18} color={Colors.primary} /><Text style={[styles.infoText, { color: theme.text }]}>{ev.registeredCount}{ev.capacity > 0 ? ` / ${ev.capacity}` : ''} {t('discover.registered')}</Text></View>
          </View>

          {/* entry pricing */}
          <View style={[styles.priceCard, { backgroundColor: theme.card }]}>
            {ev.isFree ? (
              <View style={styles.priceHeadRow}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                <Text style={[styles.priceFree, { color: Colors.primary }]}>{t('discover.free_entry')}</Text>
              </View>
            ) : (
              <>
                <View style={styles.priceHeadRow}>
                  <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.priceHead, { color: theme.text }]}>{t('discover.entry')}</Text>
                  <Text style={[styles.priceNote, { color: theme.textMuted }]}>{t('discover.pay_on_arrival_tiers')}</Text>
                </View>
                <View style={styles.priceTierRow}>
                  {(ev.priceTiers || []).map((tr) => (
                    <View key={tr.label} style={[styles.priceTier, { backgroundColor: theme.background }]}>
                      <Text style={[styles.priceTierAmt, { color: Colors.primary }]}>{tr.amount} {ev.currency || 'JOD'}</Text>
                      <Text style={[styles.priceTierLbl, { color: theme.textMuted }]}>{tr.label}</Text>
                    </View>
                  ))}
                </View>
                {ev.my?.paid && (
                  <View style={styles.paidNote}><Ionicons name="checkmark-circle" size={14} color={Colors.primary} /><Text style={[styles.paidNoteText, { color: Colors.primary }]}>{t('discover.paid')}: {ev.my.amountPaid} {ev.currency || 'JOD'}</Text></View>
                )}
              </>
            )}
          </View>

          {!!ev.description && <Text style={[styles.desc, { color: theme.textSecondary }]}>{ev.description}</Text>}

          {ev.tags.length > 0 && (
            <View style={styles.tagRow}>
              {ev.tags.map(tg => <View key={tg} style={[styles.tag, { backgroundColor: theme.card }]}><Text style={[styles.tagText, { color: theme.textSecondary }]}>{tg}</Text></View>)}
            </View>
          )}

          {classes.length > 0 && (
            <>
              <Text style={[styles.section, { color: theme.text }]}>{t('discover.schedule')}</Text>
              {classes.map((c) => {
                const cfull = c.capacity > 0 && c.enrolledCount >= c.capacity;
                const cCancelable = c.myStatus === 'enrolled' || c.myStatus === 'pending';
                const clabel = c.myStatus === 'enrolled' ? t('discover.enrolled') : c.myStatus === 'pending' ? t('discover.pending_approval') : c.myStatus === 'rejected' ? t('discover.rejected') : cfull ? t('discover.class_full') : t('discover.join_class');
                return (
                  <View key={c.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.clsTitle, { color: theme.text }]}>{c.title}</Text>
                      <View style={styles.clsMetaRow}>
                        {!!c.startTime && <Text style={[styles.clsMeta, { color: theme.textMuted }]}>{c.startTime}</Text>}
                        {!!c.duration && <Text style={[styles.clsMeta, { color: theme.textMuted }]}>· {c.duration}</Text>}
                        {!!c.coachName && <Text style={[styles.clsMeta, { color: theme.textMuted }]}>· {c.coachName}</Text>}
                      </View>
                      {c.capacity > 0 && <Text style={[styles.clsMeta, { color: theme.textMuted }]}>{c.enrolledCount}/{c.capacity} {t('discover.enrolled_count')}</Text>}
                    </View>
                    {manages ? (
                      <View style={[styles.clsBtn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}>
                        <Text style={[styles.clsBtnText, { color: theme.textMuted }]}>—</Text>
                      </View>
                    ) : (
                      <Pressable onPress={() => joinClass(c)} disabled={cfull && !cCancelable}
                        style={[styles.clsBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.myStatus === 'enrolled' ? Colors.primary : c.myStatus || cfull ? theme.background : Colors.primary + '20', borderColor: Colors.primary, borderWidth: c.myStatus === 'enrolled' ? 0 : 1 }]}>
                        <Text style={[styles.clsBtnText, { color: c.myStatus === 'enrolled' ? '#fff' : c.myStatus || cfull ? theme.textMuted : Colors.primary }]}>{clabel}</Text>
                        {cCancelable && <Ionicons name="close" size={12} color={c.myStatus === 'enrolled' ? '#fff' : theme.textMuted} />}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        {manages ? (
          <View style={[styles.regGradient, { backgroundColor: theme.card }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.regText, { color: theme.textMuted }]}>{label}</Text>
          </View>
        ) : (
          <Pressable onPress={register} style={styles.regBtn} disabled={full && !canCancel}>
            <LinearGradient colors={canCancel ? ['#F87171', '#e05555'] : full ? ['#3a3a44', '#2a2a32'] : [Colors.primary, Colors.primaryDark]} style={styles.regGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name={canCancel ? 'close-circle' : myStatus === 'rejected' ? 'close' : 'trophy'} size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.regText}>{label}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  scroll: { paddingBottom: 120 },
  cover: { width: '100%', height: 180 },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  name: { fontSize: 24, fontFamily: 'Rubik_700Bold', marginBottom: 16 },
  infoCard: { gap: 12, marginBottom: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  desc: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 21, marginBottom: 16 },
  priceCard: { borderRadius: 14, padding: 14, marginBottom: 18 },
  priceHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceHead: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', flex: 1 },
  priceFree: { fontSize: 15, fontFamily: 'Rubik_700Bold' },
  priceNote: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  priceTierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  priceTier: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 2, minWidth: 74 },
  priceTierAmt: { fontSize: 15, fontFamily: 'Rubik_700Bold' },
  priceTierLbl: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  paidNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  paidNoteText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  section: { fontSize: 17, fontFamily: 'Rubik_700Bold', marginTop: 24, marginBottom: 12 },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  clsTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  clsMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  clsMeta: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  clsBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clsBtnText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  regBtn: { borderRadius: 14, overflow: 'hidden' },
  regGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  regText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
});
