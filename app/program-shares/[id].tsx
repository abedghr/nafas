import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { confirmDialog } from '@/lib/dialog';
import { workoutApi } from '@/src/features/workout/api';
import { Display, SectionHeader, StatTile, EmptyState } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import Colors from '@/constants/colors';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

export default function ProgramSharesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, programs } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const program = programs.find((p) => p.id === id);

  const [data, setData] = useState<{ shares: any[]; activeUsers: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    workoutApi.programShares(String(id)).then((d) => setData(d)).catch(() => setData({ shares: [], activeUsers: 0, total: 0 })).finally(() => setLoading(false));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const statusMeta = (sh: any): { label: string; color: string } => {
    if (sh.status === 'accepted') return sh.accessExpired ? { label: t('programs.shareExpired', { defaultValue: 'Access ended' }), color: theme.textMuted } : { label: t('programs.shareActive', { defaultValue: 'Active' }), color: Colors.electric };
    if (sh.status === 'pending') return sh.claimExpired ? { label: t('programs.shareExpired', { defaultValue: 'Expired' }), color: Colors.semantic.danger } : { label: t('programs.sharePending', { defaultValue: 'Pending' }), color: Colors.ring.amber };
    if (sh.status === 'declined') return { label: t('programs.shareDeclined', { defaultValue: 'Declined' }), color: theme.textMuted };
    if (sh.status === 'revoked') return { label: t('programs.shareRevoked', { defaultValue: 'Revoked' }), color: theme.textMuted };
    return { label: sh.status, color: theme.textMuted };
  };

  const revoke = async (sh: any) => {
    const accepted = sh.status === 'accepted';
    if (!(await confirmDialog({
      title: accepted ? t('programs.revokeAccess', { defaultValue: 'Revoke access?' }) : t('programs.cancelInvite', { defaultValue: 'Cancel invite?' }),
      message: accepted ? t('programs.revokeAccessSub', { defaultValue: "This ends their access to their copy of the program." }) : t('programs.cancelInviteSub', { defaultValue: 'They will no longer be able to accept this.' }),
      destructive: true,
      confirmText: accepted ? t('programs.revoke', { defaultValue: 'Revoke' }) : t('programs.cancelInviteConfirm', { defaultValue: 'Cancel invite' }),
      cancelText: t('programs.cancel'),
    }))) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setData((prev) => prev ? { ...prev, shares: prev.shares.map((x) => x.id === sh.id ? { ...x, status: 'revoked' } : x) } : prev);
    workoutApi.revokeShare(sh.id).then(load).catch(load);
  };

  const recipientLabel = (sh: any) =>
    sh.recipientName ? sh.recipientName : sh.code ? `${t('programs.code', { defaultValue: 'Code' })}: ${sh.code}` : t('programs.unclaimed', { defaultValue: 'Unclaimed' });

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text}>{t('programs.whoHasThis', { defaultValue: 'Who has this' })}</Display>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={Colors.electric} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 40 }}>
          {!!program && <Text style={[Type.overline, { color: theme.textSecondary, marginBottom: 12 }]} numberOfLines={1}>{program.name}</Text>}

          <View style={s.statsRow}>
            <StatTile icon="people-outline" value={String(data?.activeUsers ?? 0)} label={t('programs.activeUsers', { defaultValue: 'Active users' })} />
            <StatTile icon="share-social-outline" value={String(data?.total ?? 0)} label={t('programs.totalShares', { defaultValue: 'Total shares' })} color={theme.textSecondary} />
          </View>

          <SectionHeader title={t('programs.shares', { defaultValue: 'Shares' })} style={{ marginTop: 20 }} />

          {!data?.shares.length ? (
            <EmptyState icon="share-social-outline" title={t('programs.noShares', { defaultValue: 'Not shared yet' })} subtitle={t('programs.noSharesSub', { defaultValue: 'Share this program to see who has it here.' })} />
          ) : (
            data.shares.map((sh, i) => {
              const st = statusMeta(sh);
              const canRevoke = sh.status === 'pending' || (sh.status === 'accepted' && !sh.accessExpired);
              return (
                <Animated.View key={sh.id} entering={FadeInDown.duration(300).delay(i * 50)}>
                  <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={s.cardTop}>
                      <View style={[s.avatar, { backgroundColor: Colors.electric + '18' }]}>
                        <Ionicons name={sh.code && !sh.recipientName ? 'key-outline' : 'person'} size={18} color={Colors.electric} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[Type.h2, { color: theme.text }]} numberOfLines={1}>{recipientLabel(sh)}</Text>
                        {!!sh.recipientUsername && <Text style={[s.sub, { color: theme.textMuted }]} numberOfLines={1}>@{sh.recipientUsername}</Text>}
                      </View>
                      <View style={[s.statusPill, { backgroundColor: st.color + '20' }]}>
                        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    <View style={s.metaRow}>
                      <Meta icon="calendar-outline" label={t('programs.sharedOn', { defaultValue: 'Shared' })} value={fmtDate(sh.createdAt)} theme={theme} />
                      {sh.status === 'accepted' && <Meta icon="checkmark-circle-outline" label={t('programs.acceptedOn', { defaultValue: 'Accepted' })} value={fmtDate(sh.acceptedAt)} theme={theme} />}
                      {sh.status === 'pending' && <Meta icon="hourglass-outline" label={t('programs.claimBy', { defaultValue: 'Claim by' })} value={fmtDate(sh.claimExpiresAt) || t('programs.unlimited', { defaultValue: 'Unlimited' })} theme={theme} />}
                      {sh.status === 'accepted' && <Meta icon="time-outline" label={t('programs.accessUntil', { defaultValue: 'Access until' })} value={fmtDate(sh.accessExpiresAt) || t('programs.unlimited', { defaultValue: 'Unlimited' })} theme={theme} />}
                    </View>

                    {canRevoke && (
                      <Pressable onPress={() => revoke(sh)} style={({ pressed }) => [s.revokeBtn, { borderColor: Colors.semantic.danger + '55', opacity: pressed ? 0.7 : 1 }]}>
                        <Ionicons name="close-circle-outline" size={15} color={Colors.semantic.danger} />
                        <Text style={[s.revokeText, { color: Colors.semantic.danger }]}>{sh.status === 'accepted' ? t('programs.revoke', { defaultValue: 'Revoke' }) : t('programs.cancelInviteConfirm', { defaultValue: 'Cancel invite' })}</Text>
                      </Pressable>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Meta({ icon, label, value, theme }: { icon: any; label: string; value?: string | null; theme: any }) {
  if (!value) return null;
  return (
    <View style={s.meta}>
      <Ionicons name={icon} size={12} color={theme.textMuted} />
      <Text style={[s.metaLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[s.metaVal, { color: theme.textSecondary }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: 10 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sub: { fontFamily: Fonts.medium, fontSize: 12.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontFamily: Fonts.bold, fontSize: 11 },
  metaRow: { gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontFamily: Fonts.medium, fontSize: 12 },
  metaVal: { fontFamily: Fonts.semibold, fontSize: 12, marginLeft: 'auto' },
  revokeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12, borderWidth: 1 },
  revokeText: { fontFamily: Fonts.semibold, fontSize: 13 },
});
