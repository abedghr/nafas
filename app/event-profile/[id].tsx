import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, Chip, HeroCard, SectionHeader, Button, EmptyState, Skeleton } from '@/components/ui';
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
          <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
          <View style={{ width: 40 }} />
        </View>
        {status === 'loading' ? (
          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <Skeleton height={220} radius={24} />
            <Skeleton height={20} width="70%" radius={8} />
            <Skeleton height={14} width="90%" radius={8} />
            <Skeleton height={14} width="80%" radius={8} />
          </View>
        ) : (
          <EmptyState icon="trophy-outline" title={t('discover.no_events')} />
        )}
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
        <Pressable onPress={back} style={[styles.backBtn, styles.backBtnFloat]}><Ionicons name="chevron-back" size={24} color="#fff" /></Pressable>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <HeroCard
            image={ev.coverUrl ? { uri: ev.coverUrl } : undefined}
            title={ev.name}
            height={240}
            style={styles.hero}
          >
            <Text style={styles.heroOverline} numberOfLines={1}>{t(`discover.event_type_${ev.type}`)}{ev.category ? ` · ${ev.category}` : ''}</Text>
          </HeroCard>
        </Animated.View>

        <View style={styles.body}>
          {/* date / place / people meta chips */}
          <Animated.View entering={FadeInDown.duration(320).delay(80)} style={styles.metaChips}>
            {!!fmt(ev.startsAt) && <Chip label={`${fmt(ev.startsAt)}${ev.endsAt ? ` → ${fmt(ev.endsAt)}` : ''}`} icon="calendar-outline" />}
            <Chip label={`${ev.venue}${ev.city ? `, ${ev.city}` : ''}`} icon="location-outline" onPress={ev.lat != null ? directions : undefined} />
            <Chip label={`${ev.registeredCount}${ev.capacity > 0 ? ` / ${ev.capacity}` : ''} ${t('discover.registered')}`} icon="people-outline" />
          </Animated.View>

          {/* entry pricing */}
          <Animated.View entering={FadeInDown.duration(320).delay(140)}>
            <SectionHeader title={t('discover.entry')} style={styles.sectionSpace} />
            {ev.isFree ? (
              <Chip label={t('discover.free_entry')} icon="pricetag-outline" active />
            ) : (
              <>
                <View style={styles.tierRow}>
                  {(ev.priceTiers || []).map((tr) => (
                    <View key={tr.label} style={[styles.priceTier, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.priceTierAmt, { color: Colors.electric }]}>{tr.amount} {ev.currency || 'JOD'}</Text>
                      <Text style={[styles.priceTierLbl, { color: theme.textMuted }]}>{tr.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.priceNote, { color: theme.textMuted }]}>{t('discover.pay_on_arrival_tiers')}</Text>
                {ev.my?.paid && (
                  <View style={styles.paidNote}><Ionicons name="checkmark-circle" size={14} color={Colors.electric} /><Text style={[styles.paidNoteText, { color: Colors.electric }]}>{t('discover.paid')}: {ev.my.amountPaid} {ev.currency || 'JOD'}</Text></View>
                )}
              </>
            )}
          </Animated.View>

          {!!ev.description && (
            <Animated.View entering={FadeInDown.duration(320).delay(180)}>
              <Text style={[styles.desc, styles.sectionSpace, { color: theme.textSecondary }]}>{ev.description}</Text>
            </Animated.View>
          )}

          {ev.tags.length > 0 && (
            <View style={styles.tagRow}>
              {ev.tags.map(tg => <Chip key={tg} label={tg} />)}
            </View>
          )}

          {classes.length > 0 && (
            <>
              <SectionHeader title={t('discover.schedule')} style={styles.sectionSpace} />
              {classes.map((c, i) => {
                const cfull = c.capacity > 0 && c.enrolledCount >= c.capacity;
                const cCancelable = c.myStatus === 'enrolled' || c.myStatus === 'pending';
                const clabel = c.myStatus === 'enrolled' ? t('discover.enrolled') : c.myStatus === 'pending' ? t('discover.pending_approval') : c.myStatus === 'rejected' ? t('discover.rejected') : cfull ? t('discover.class_full') : t('discover.join_class');
                return (
                  <Animated.View key={c.id} entering={FadeInDown.duration(300).delay(i * 60)}>
                    <View style={[styles.classCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                          style={[styles.clsBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.myStatus === 'enrolled' ? Colors.electric : c.myStatus || cfull ? theme.background : Colors.electric + '20', borderColor: Colors.electric, borderWidth: c.myStatus === 'enrolled' ? 0 : 1 }]}>
                          <Text style={[styles.clsBtnText, { color: c.myStatus === 'enrolled' ? '#04120B' : c.myStatus || cfull ? theme.textMuted : Colors.electric }]}>{clabel}</Text>
                          {cCancelable && <Ionicons name="close" size={12} color={c.myStatus === 'enrolled' ? '#04120B' : theme.textMuted} />}
                        </Pressable>
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        {manages ? (
          <Button variant="ghost" label={label} icon="shield-checkmark" disabled onPress={() => {}} />
        ) : (
          <Button
            variant={canCancel ? 'ghost' : 'solid'}
            label={label}
            icon={canCancel ? 'close-circle' : myStatus === 'rejected' ? 'close' : full ? 'lock-closed' : 'trophy'}
            disabled={full && !canCancel}
            onPress={register}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backBtnFloat: { borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)' },
  scroll: { paddingBottom: 120 },
  hero: { marginHorizontal: 0, borderRadius: 0 },
  heroOverline: { fontFamily: Fonts.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: Colors.electric },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionSpace: { marginTop: 22 },
  desc: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 21 },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceTier: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, alignItems: 'center', gap: 2, minWidth: 78, borderWidth: 1 },
  priceTierAmt: { fontSize: 15, fontFamily: Fonts.bold },
  priceTierLbl: { fontSize: 11, fontFamily: Fonts.regular },
  priceNote: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 8 },
  paidNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  paidNoteText: { fontSize: 12, fontFamily: Fonts.semibold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  clsTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  clsMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  clsMeta: { fontSize: 12, fontFamily: Fonts.regular },
  clsBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  clsBtnText: { fontSize: 12, fontFamily: Fonts.semibold },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
