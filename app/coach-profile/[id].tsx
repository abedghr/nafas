import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { HeroCard, StatTile, Chip, Button, SectionHeader, EmptyState } from '@/components/ui';
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

  const topPad = Platform.OS === 'web' ? 67 + 16 : insets.top + 8;

  if (status !== 'ok' || !c) {
    return (
      <View style={[s.container, { backgroundColor: theme.background }]}>
        <View style={[s.header, { paddingTop: topPad }]}>
          <Button variant="icon" icon="chevron-back" onPress={back} />
          <View style={{ flex: 1 }} />
        </View>
        <View style={s.center}>
          {status === 'loading'
            ? <ActivityIndicator color={Colors.electric} />
            : <EmptyState icon="person-outline" title={t('discover.not_found')} />}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad }]}>
        <Button variant="icon" icon="chevron-back" onPress={back} />
        <Text style={[Type.h2, { color: theme.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>{c.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 110 }]}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <HeroCard
            image={c.coverUrl ? { uri: c.coverUrl } : c.avatarUrl ? { uri: c.avatarUrl } : undefined}
            height={264}
            title={c.name}
            subtitle={c.headline || undefined}
          >
            <View style={s.heroBadges}>
              {c.verificationStatus === 'verified' && (
                <View style={s.verifyPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#04120B" />
                  <Text style={s.verifyText}>{t('discover.verified')}</Text>
                </View>
              )}
              {!!c.gymName && (
                <View style={s.glassPill}>
                  <Ionicons name="barbell-outline" size={12} color={Colors.electric} />
                  <Text style={s.glassText}>{c.gymName}</Text>
                </View>
              )}
              {c.clientsCount > 0 && (
                <View style={s.glassPill}>
                  <Ionicons name="people" size={12} color="#E6F5EE" />
                  <Text style={s.glassText}>{c.clientsCount}</Text>
                </View>
              )}
            </View>
          </HeroCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={s.statsRow}>
          <StatTile icon="star" color="#FFD700" value={String(c.rating)} label={t('discover.rating')} />
          <StatTile icon="chatbox-ellipses-outline" color={theme.textSecondary} value={String(c.reviewsCount)} label={t('discover.reviews')} />
          <StatTile icon="ribbon-outline" color={Colors.electric} value={`${c.yearsExperience}y`} label={t('authx.yearsOfExperience')} />
        </Animated.View>

        {c.specialty.length > 0 && (
          <Animated.View entering={FadeInDown.duration(500).delay(160)} style={s.chipRow}>
            {c.specialty.map(spec => <Chip key={spec} label={spec} />)}
          </Animated.View>
        )}

        {(!!c.phone || !!c.whatsapp) && (
          <Animated.View entering={FadeInDown.duration(500).delay(220)} style={s.contactRow}>
            {!!c.phone && <Button variant="ghost" icon="call-outline" label={t('discover.call')} onPress={handleCall} style={{ flex: 1 }} />}
            {!!c.whatsapp && <Button variant="ghost" icon="logo-whatsapp" label={t('discover.whatsapp')} onPress={handleWhatsapp} style={{ flex: 1 }} />}
          </Animated.View>
        )}

        <View style={s.tabRow}>
          {(['info', 'results'] as const).map(tb => (
            <Chip
              key={tb}
              label={`${t(`discover.${tb}`)}${tb === 'results' && c.transformations?.length ? ` (${c.transformations.length})` : ''}`}
              active={tab === tb}
              onPress={() => setTab(tb)}
            />
          ))}
        </View>

        {tab === 'results' ? (
          (c.transformations?.length ?? 0) === 0 ? (
            <EmptyState icon="images-outline" title={t('discover.no_results')} />
          ) : c.transformations!.map((tr, i) => (
            <Animated.View key={tr.id} entering={FadeInDown.duration(400).delay(i * 60)}>
              <View style={[s.resultCard, { backgroundColor: theme.card }]}>
                <View style={s.baRow}>
                  <View style={s.baCol}>
                    <View style={[s.baImgWrap, { backgroundColor: theme.cardAlt }]}>
                      {tr.beforeImage ? <Image source={{ uri: tr.beforeImage }} style={s.baImg} /> : <Ionicons name="image-outline" size={28} color={theme.textMuted} />}
                      <View style={[s.baTag, { backgroundColor: theme.scrim }]}><Text style={s.baTagText}>{t('discover.before')}</Text></View>
                    </View>
                  </View>
                  <View style={s.baArrow}><Ionicons name="arrow-forward" size={20} color={Colors.electric} /></View>
                  <View style={s.baCol}>
                    <View style={[s.baImgWrap, { backgroundColor: theme.cardAlt }]}>
                      {tr.afterImage ? <Image source={{ uri: tr.afterImage }} style={s.baImg} /> : <Ionicons name="image-outline" size={28} color={theme.textMuted} />}
                      <View style={[s.baTag, { backgroundColor: Colors.electric }]}><Text style={[s.baTagText, { color: '#04120B' }]}>{t('discover.after')}</Text></View>
                    </View>
                  </View>
                </View>
                <View style={s.baMeta}>
                  {!!tr.clientName && <Text style={[Type.h2, { color: theme.text, marginBottom: 6 }]}>{tr.clientName}</Text>}
                  <View style={s.baMetaRow}>
                    {!!tr.target && <View style={[s.baChip, { backgroundColor: Colors.electric + '18' }]}><Ionicons name="flag-outline" size={12} color={Colors.electric} /><Text style={[s.baChipText, { color: theme.textSecondary }]}>{tr.target}</Text></View>}
                    {!!tr.duration && <View style={[s.baChip, { backgroundColor: theme.cardAlt }]}><Ionicons name="time-outline" size={12} color={Colors.electric} /><Text style={[s.baChipText, { color: theme.textSecondary }]}>{tr.duration}</Text></View>}
                  </View>
                </View>
              </View>
            </Animated.View>
          ))
        ) : (<>

          {!!c.bio && (
            <Animated.View entering={FadeInDown.duration(500).delay(80)} style={s.sectionWrap}>
              <SectionHeader title={t('workoutTab.about')} />
              <View style={[s.card, { backgroundColor: theme.card }]}>
                <Text style={[Type.body, { color: theme.textSecondary }]}>{c.bio}</Text>
              </View>
            </Animated.View>
          )}

          {c.certifications.length > 0 && (
            <Animated.View entering={FadeInDown.duration(500).delay(140)} style={s.sectionWrap}>
              <SectionHeader title={t('discover.certifications')} />
              <View style={[s.card, { backgroundColor: theme.card }]}>
                {c.certifications.map((cert, i) => (
                  <View key={i} style={[s.certRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Ionicons name="ribbon-outline" size={16} color={Colors.electric} />
                    <Text style={[Type.bodyMed, { color: theme.text, flex: 1 }]}>{cert}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {!!c.plans?.length && (
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={s.sectionWrap}>
              <SectionHeader title={t('discover.plans')} />
              {c.plans.map((p) => (
                <View key={p.id} style={[s.planCard, { backgroundColor: theme.card }]}>
                  <View style={s.planHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Type.h2, { color: theme.text }]}>{p.name}</Text>
                      {!!p.duration && <Text style={[Type.small, { color: theme.textMuted, marginTop: 2 }]}>{p.duration}</Text>}
                    </View>
                  </View>
                  {p.includes.length > 0 && (
                    <View style={s.planIncludes}>
                      {p.includes.map((inc, i) => (
                        <View key={i} style={s.planIncRow}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.electric} />
                          <Text style={[Type.small, { color: theme.textSecondary }]}>{inc}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Button
                    variant="solid"
                    label={booked ? t('discover.interest_sent') : t('discover.interested')}
                    onPress={() => handleInterest(p.id)}
                    disabled={booked}
                    style={{ marginTop: 14 }}
                  />
                </View>
              ))}
            </Animated.View>
          )}
        </>
        )}
      </ScrollView>

      <View style={[s.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        <Button
          variant="solid"
          icon={booked ? 'checkmark' : 'calendar-outline'}
          label={booked ? t('discover.interest_sent') : t('discover.book')}
          onPress={() => handleInterest()}
          disabled={booked}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  verifyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.electric, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  verifyText: { fontFamily: Fonts.bold, fontSize: 11, color: '#04120B' },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  glassText: { fontFamily: Fonts.semibold, fontSize: 12, color: '#E6F5EE' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  contactRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 16 },
  sectionWrap: { marginTop: 24 },
  card: { borderRadius: 16, padding: 16 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  resultCard: { borderRadius: 20, padding: 14, marginBottom: 12 },
  baRow: { flexDirection: 'row', alignItems: 'center' },
  baCol: { flex: 1 },
  baImgWrap: { aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  baImg: { width: '100%', height: '100%' },
  baTag: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  baTagText: { color: '#fff', fontSize: 10, fontFamily: Fonts.semibold },
  baArrow: { width: 36, alignItems: 'center' },
  baMeta: { marginTop: 12 },
  baMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  baChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  baChipText: { fontSize: 12, fontFamily: Fonts.medium },
  planCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  planPrice: { fontSize: 17, fontFamily: Fonts.monoBold, color: Colors.electric },
  planIncludes: { gap: 8, marginTop: 12 },
  planIncRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  priceLine: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center' },
});
