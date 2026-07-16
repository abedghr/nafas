import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, Image, Linking,
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
import { coachesApi, type ApiCoach } from '@/src/features/coaches/api';

export default function CoachProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [c, setC] = useState<ApiCoach | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [booked, setBooked] = useState(false);
  const [tab, setTab] = useState<'info' | 'results'>('info');

  useEffect(() => {
    let active = true;
    if (!id) return;
    coachesApi.get(String(id)).then(d => { if (active) { setC(d); setStatus('ok'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const handleCall = () => { if (c?.phone) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${c.phone}`); } };
  const handleWhatsapp = () => { if (c?.whatsapp) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`); } };
  // interest lead — tells the coach to contact you (no payment)
  const handleInterest = (planId?: string) => {
    if (!c || booked) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBooked(true);
    coachesApi.book(c.id, planId ? { planId } : {}).catch(() => setBooked(false));
  };

  if (status !== 'ok' || !c) {
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
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{c.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}>
        {!!c.coverUrl && <Image source={{ uri: c.coverUrl }} style={styles.cover} resizeMode="cover" />}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          {c.avatarUrl ? <Image source={{ uri: c.avatarUrl }} style={styles.avatarCircle} resizeMode="cover" /> : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="person" size={34} color="#fff" />
            </LinearGradient>
          )}
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]}>{c.name}</Text>
            {c.verificationStatus === 'verified' && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
          </View>
          {!!c.headline && <Text style={[styles.headline, { color: theme.textSecondary }]}>{c.headline}</Text>}
          {!!c.gymName && (
            <View style={styles.gymRow}>
              <Ionicons name="barbell-outline" size={13} color={Colors.primary} />
              <Text style={[styles.gymName, { color: Colors.primary }]}>{c.gymName}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Ionicons name="star" size={14} color="#FFD700" /><Text style={[styles.metaText, { color: theme.text }]}>{c.rating} ({c.reviewsCount})</Text></View>
            <View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} />
            <View style={styles.metaItem}><Ionicons name="people-outline" size={14} color={theme.textSecondary} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>{c.clientsCount}</Text></View>
            <View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} />
            <View style={styles.metaItem}><Ionicons name="ribbon-outline" size={14} color={theme.textSecondary} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>{c.yearsExperience}y</Text></View>
          </View>
          {c.specialty.length > 0 && (
            <View style={styles.tagRow}>
              {c.specialty.map(s => <View key={s} style={[styles.tag, { backgroundColor: Colors.primary + '18' }]}><Text style={[styles.tagText, { color: Colors.primary }]}>{s}</Text></View>)}
            </View>
          )}
          {(!!c.phone || !!c.whatsapp) && (
            <View style={styles.contactRow}>
              {!!c.phone && (
                <Pressable onPress={handleCall} style={[styles.contactBtn, { borderColor: theme.border }]}>
                  <Ionicons name="call-outline" size={15} color={theme.text} /><Text style={[styles.contactText, { color: theme.text }]}>{t('discover.call')}</Text>
                </Pressable>
              )}
              {!!c.whatsapp && (
                <Pressable onPress={handleWhatsapp} style={[styles.contactBtn, { borderColor: '#25D36680', backgroundColor: '#25D36618' }]}>
                  <Ionicons name="logo-whatsapp" size={15} color="#25D366" /><Text style={[styles.contactText, { color: '#25D366' }]}>{t('discover.whatsapp')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </Animated.View>

        <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
          {(['info', 'results'] as const).map(tb => (
            <Pressable key={tb} onPress={() => setTab(tb)} style={[styles.tabBtn, tab === tb && { backgroundColor: Colors.primary }]}>
              <Text style={[styles.tabBtnText, { color: tab === tb ? '#fff' : theme.textMuted }]}>{t(`discover.${tb}`)}{tb === 'results' && c.transformations?.length ? ` (${c.transformations.length})` : ''}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'results' ? (
          (c.transformations?.length ?? 0) === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted, textAlign: 'center', paddingTop: 30 }]}>{t('discover.no_results')}</Text>
          ) : c.transformations!.map((tr) => (
            <View key={tr.id} style={[styles.resultCard, { backgroundColor: theme.card }]}>
              <View style={styles.baRow}>
                <View style={styles.baCol}>
                  <View style={[styles.baImgWrap, { backgroundColor: theme.background }]}>
                    {tr.beforeImage ? <Image source={{ uri: tr.beforeImage }} style={styles.baImg} /> : <Ionicons name="image-outline" size={28} color={theme.textMuted} />}
                    <View style={[styles.baTag, { backgroundColor: theme.textMuted }]}><Text style={styles.baTagText}>{t('discover.before')}</Text></View>
                  </View>
                </View>
                <View style={styles.baArrow}><Ionicons name="arrow-forward" size={22} color={Colors.primary} /></View>
                <View style={styles.baCol}>
                  <View style={[styles.baImgWrap, { backgroundColor: theme.background }]}>
                    {tr.afterImage ? <Image source={{ uri: tr.afterImage }} style={styles.baImg} /> : <Ionicons name="image-outline" size={28} color={theme.textMuted} />}
                    <View style={[styles.baTag, { backgroundColor: Colors.primary }]}><Text style={styles.baTagText}>{t('discover.after')}</Text></View>
                  </View>
                </View>
              </View>
              <View style={styles.baMeta}>
                {!!tr.clientName && <Text style={[styles.baClient, { color: theme.text }]}>{tr.clientName}</Text>}
                <View style={styles.baMetaRow}>
                  {!!tr.target && <View style={styles.baChip}><Ionicons name="flag-outline" size={12} color={Colors.primary} /><Text style={[styles.baChipText, { color: theme.textSecondary }]}>{tr.target}</Text></View>}
                  {!!tr.duration && <View style={styles.baChip}><Ionicons name="time-outline" size={12} color={Colors.primary} /><Text style={[styles.baChipText, { color: theme.textSecondary }]}>{tr.duration}</Text></View>}
                </View>
              </View>
            </View>
          ))
        ) : (<>

        {!!c.bio && <Text style={[styles.bio, { color: theme.textSecondary }]}>{c.bio}</Text>}

        {c.certifications.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.certifications')}</Text>
            <View style={[styles.certCard, { backgroundColor: theme.card }]}>
              {c.certifications.map((cert, i) => (
                <View key={i} style={[styles.certRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
                  <Ionicons name="ribbon-outline" size={16} color={Colors.primary} />
                  <Text style={[styles.certText, { color: theme.text }]}>{cert}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!!c.plans?.length && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.plans')}</Text>
            {c.plans.map((p) => (
              <View key={p.id} style={[styles.planCard, { backgroundColor: theme.card }]}>
                <View style={styles.planHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: theme.text }]}>{p.name}</Text>
                    {!!p.duration && <Text style={[styles.planDuration, { color: theme.textMuted }]}>{p.duration}</Text>}
                  </View>
                  {p.price && <Text style={[styles.planPrice, { color: Colors.primary }]}>{p.price.amount} {p.price.currency}</Text>}
                </View>
                {p.includes.length > 0 && (
                  <View style={styles.planIncludes}>
                    {p.includes.map((inc, i) => (
                      <View key={i} style={styles.planIncRow}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                        <Text style={[styles.planIncText, { color: theme.textSecondary }]}>{inc}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Pressable onPress={() => handleInterest(p.id)} disabled={booked} style={[styles.planBtn, { borderColor: Colors.primary, opacity: booked ? 0.5 : 1 }]}>
                  <Text style={[styles.planBtnText, { color: Colors.primary }]}>{booked ? t('discover.interest_sent') : t('discover.interested')}</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}
        </>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        {c.pricePerSession && !booked && (
          <Text style={[styles.priceLine, { color: theme.textSecondary }]}>
            <Text style={{ color: Colors.primary, fontFamily: 'Rubik_700Bold' }}>{c.pricePerSession.amount} {c.pricePerSession.currency}</Text> {t('discover.per_session')}
          </Text>
        )}
        <Pressable onPress={() => handleInterest()} style={styles.bookBtn} disabled={booked}>
          <LinearGradient colors={booked ? ['#3a3a44', '#2a2a32'] : [Colors.primary, Colors.primaryDark]} style={styles.bookGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name={booked ? 'checkmark' : 'calendar-outline'} size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.bookText}>{booked ? t('discover.interest_sent') : t('discover.book')}</Text>
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
  cover: { width: '100%', height: 130, borderRadius: 16, marginBottom: -32 },
  heroSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 3, borderColor: '#0A0A0F' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 22, fontFamily: 'Rubik_700Bold', textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, marginBottom: 16 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabBtnText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  resultCard: { borderRadius: 16, padding: 14, marginBottom: 12 },
  baRow: { flexDirection: 'row', alignItems: 'center' },
  baCol: { flex: 1 },
  baImgWrap: { aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  baImg: { width: '100%', height: '100%' },
  baTag: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  baTagText: { color: '#fff', fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  baArrow: { width: 36, alignItems: 'center' },
  baMeta: { marginTop: 10 },
  baClient: { fontSize: 14, fontFamily: 'Rubik_600SemiBold', marginBottom: 6 },
  baMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  baChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00C89614', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  baChipText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  contactText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  planCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  planName: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  planDuration: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  planPrice: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  planIncludes: { gap: 6, marginTop: 12 },
  planIncRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planIncText: { fontSize: 13, fontFamily: 'Rubik_400Regular' },
  planBtn: { marginTop: 14, borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  planBtnText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  headline: { fontSize: 14, fontFamily: 'Rubik_400Regular', marginTop: 4, textAlign: 'center' },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gymName: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  tag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  tagText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  bio: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold', marginBottom: 12 },
  certCard: { borderRadius: 14, paddingHorizontal: 16 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  certText: { fontSize: 14, fontFamily: 'Rubik_500Medium', flex: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 8 },
  priceLine: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center' },
  bookBtn: { borderRadius: 14, overflow: 'hidden' },
  bookGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  bookText: { color: '#fff', fontSize: 17, fontFamily: 'Rubik_700Bold' },
});
