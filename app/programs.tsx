import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp, type Program } from '@/lib/app-context';
import { confirmDialog, alertDialog } from '@/lib/dialog';
import { workoutApi } from '@/src/features/workout/api';
import { Button, Chip, ProgressRing, EmptyState, Display, SectionHeader } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import Colors from '@/constants/colors';

export default function ProgramsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { programs, addProgram, deleteProgram, refreshPrograms, activeEnrollment, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [invites, setInvites] = useState<any[]>([]);
  const [claimOpen, setClaimOpen] = useState(false);
  const [code, setCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [followers, setFollowers] = useState<Record<string, number>>({}); // programId → active users following
  const [filter, setFilter] = useState<'active' | 'shared' | 'expired'>('active'); // default hides expired

  const loadInvites = useCallback(() => {
    workoutApi.programInvites().then((d) => setInvites(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  // follower counts for programs the user owns + has shared (small list; one call each)
  const loadFollowers = useCallback(() => {
    for (const p of programs as any[]) {
      if (!p.canShare) continue;
      workoutApi.programShares(p.id).then((r) => setFollowers((m) => ({ ...m, [p.id]: r?.activeUsers ?? 0 }))).catch(() => {});
    }
  }, [programs]);
  useFocusEffect(useCallback(() => { loadInvites(); loadFollowers(); }, [loadInvites, loadFollowers]));

  const handleNewProgram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const id = addProgram({ name: 'New Program', startDate: null, weeks: 1, notes: '', days: [] });
    router.push(('/program/' + id + '?edit=1') as any);
  };

  const handleDelete = async (p: Program) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (await confirmDialog({
      title: t('programs.deleteProgram'), message: t('programs.deleteProgramConfirm', { name: p.name }),
      destructive: true, confirmText: t('programs.delete'), cancelText: t('programs.cancel'),
    })) deleteProgram(p.id);
  };

  const accept = async (inv: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await workoutApi.acceptInvite(inv.id);
      setInvites((prev) => prev.filter((x) => x.id !== inv.id));
      refreshPrograms();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await alertDialog(t('programs.inviteExpired', { defaultValue: 'Invite unavailable' }), t('programs.inviteExpiredSub', { defaultValue: 'This invite has expired or was withdrawn.' }));
      loadInvites();
    }
  };
  const decline = async (inv: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInvites((prev) => prev.filter((x) => x.id !== inv.id));
    workoutApi.declineInvite(inv.id).catch(() => {});
  };

  const submitClaim = async () => {
    if (!code.trim() || claiming) return;
    setClaiming(true);
    try {
      await workoutApi.claimProgram(code.trim().toUpperCase());
      setClaimOpen(false); setCode('');
      refreshPrograms();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await alertDialog(t('programs.claimFailed', { defaultValue: 'Code not valid' }), t('programs.claimFailedSub', { defaultValue: 'The code is wrong, already used, or expired.' }));
    } finally { setClaiming(false); }
  };


  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text}>{t('programs.title')}</Display>
        <Pressable onPress={() => setClaimOpen(true)} hitSlop={12} style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="enter-outline" size={20} color={Colors.electric} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 40 }}>
        {/* pinned invites */}
        {invites.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ marginBottom: 18 }}>
            <SectionHeader title={t('programs.invites', { defaultValue: 'Invites' })} />
            {invites.map((inv) => (
              <View key={inv.id} style={[s.inviteCard, { borderColor: Colors.electric + '55' }]}>
                <View style={s.inviteTop}>
                  <View style={[s.inviteIcon, { backgroundColor: Colors.electric + '18' }]}>
                    <Ionicons name="gift-outline" size={18} color={Colors.electric} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.h2, { color: theme.text }]} numberOfLines={1}>{inv.programName}</Text>
                    <Text style={[s.inviteMeta, { color: theme.textMuted }]} numberOfLines={1}>
                      {t('programs.fromOwner', { defaultValue: 'from' })} {inv.ownerName} · {t('programs.weeksCount', { n: inv.weeks })}
                    </Text>
                  </View>
                </View>
                <View style={s.inviteActions}>
                  <Button variant="ghost" label={t('programs.decline', { defaultValue: 'Decline' })} onPress={() => decline(inv)} style={{ flex: 1 }} />
                  <Button variant="solid" label={t('programs.accept', { defaultValue: 'Accept' })} icon="checkmark" onPress={() => accept(inv)} style={{ flex: 1 }} />
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(450)} style={{ marginBottom: 20, gap: 10 }}>
          <Button variant="primary" label={t('programs.newProgram')} playIcon="add" onPress={handleNewProgram} />
          <Button variant="ghost" icon="sparkles" label={t('programs.createWithAI', { defaultValue: 'Create with AI' })} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/ai-create' as any); }} />
        </Animated.View>

        {programs.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('programs.noPrograms')} subtitle={t('programs.noProgramsSub')} />
        ) : (() => {
          const isRec = (p: any) => !p.canShare && p.canShare !== undefined;
          const expiredCount = programs.filter((p: any) => p.expired).length;
          const shown = programs.filter((p: any) => {
            if (filter === 'expired') return !!p.expired;
            if (filter === 'shared') return isRec(p) && !p.expired;
            return !p.expired; // active (default)
          });
          const filters: { key: typeof filter; label: string }[] = [
            { key: 'active', label: t('programs.filterActive', { defaultValue: 'Active' }) },
            { key: 'shared', label: t('programs.filterShared', { defaultValue: 'Shared' }) },
            ...(expiredCount > 0 ? [{ key: 'expired' as const, label: t('programs.filterExpired', { defaultValue: 'Expired' }) }] : []),
          ];
          return (
          <>
          <View style={s.filterRow}>
            {filters.map((f) => {
              const on = filter === f.key;
              return (
                <Pressable key={f.key} onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }} style={[s.filterPill, { backgroundColor: on ? Colors.electric : theme.card, borderColor: on ? Colors.electric : theme.border }]}>
                  <Text style={[s.filterPillText, { color: on ? '#03110D' : theme.textSecondary }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {shown.length === 0 ? (
            <EmptyState icon="funnel-outline" title={t('programs.noneInFilter', { defaultValue: 'Nothing here' })} subtitle={t('programs.noneInFilterSub', { defaultValue: 'No programs match this filter.' })} />
          ) : (
          shown.map((p: any, index) => {
            const totalDays = p.days?.length ?? 0;
            const trainingDays = (p.days ?? []).filter((d: any) => !d.restDay && ((d.exercises?.length ?? 0) > 0 || d.templateId || d.label)).length;
            const weeks = Math.max(1, p.weeks || Math.ceil(totalDays / 7));
            const expired = !!p.expired;
            const received = !p.canShare && p.canShare !== undefined;
            const isActive = activeEnrollment?.programId === p.id;
            const fc = followers[p.id] ?? 0;
            // shared programs can carry an access window — show the countdown
            const expAt = p.accessExpiresAt ? new Date(p.accessExpiresAt) : null;
            const daysLeft = expAt && !expired ? Math.max(0, Math.ceil((expAt.getTime() - Date.now()) / 86400000)) : null;
            return (
              <Animated.View key={p.id} entering={FadeInDown.duration(350).delay(index * 70)}>
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(('/program/' + p.id) as any); }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.92 : expired ? 0.5 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}
                >
                  <View style={[s.programCard, { backgroundColor: theme.card, borderColor: isActive ? Colors.electric + '55' : theme.border }]}>
                    <View style={[s.programIcon, { backgroundColor: (expired ? theme.textMuted : Colors.electric) + '1F' }]}>
                      <Ionicons name="flag" size={22} color={expired ? theme.textMuted : Colors.electric} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.nameRow}>
                        <Display variant="d3" color={theme.text} numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Display>
                        {isActive && (
                          <View style={[s.activePill, { backgroundColor: Colors.electric }]}>
                            <View style={s.activeDot} />
                            <Text style={s.activePillText}>{t('programs.active', { defaultValue: 'Active' })}</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.chipRow}>
                        <Chip label={t('programs.daysCount', { n: totalDays, defaultValue: `${totalDays} days` })} icon="calendar-outline" />
                        <Chip label={t('programs.weeksCount', { n: weeks, defaultValue: `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` })} icon="albums-outline" />
                        {trainingDays > 0 && <Chip label={t('programs.trainingDaysCount', { n: trainingDays, defaultValue: `${trainingDays} training` })} icon="barbell-outline" />}
                        {fc > 0 && <Chip label={t('programs.followersCount', { n: fc, defaultValue: `${fc} ${fc === 1 ? 'athlete' : 'athletes'}` })} icon="people-outline" />}
                        {received && <Chip label={t('programs.shared', { defaultValue: 'Shared' })} icon="gift-outline" />}
                        {daysLeft != null && <Chip label={daysLeft === 0 ? t('programs.expiresToday', { defaultValue: 'Expires today' }) : t('programs.daysLeft', { n: daysLeft, defaultValue: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left` })} icon="hourglass-outline" />}
                        {expired && <Chip label={t('programs.expired', { defaultValue: 'Expired' })} icon="time-outline" />}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
          )}
          </>
          );
        })()}
      </ScrollView>

      {/* claim by code */}
      <Modal visible={claimOpen} transparent animationType="fade" onRequestClose={() => setClaimOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setClaimOpen(false)}>
          <Pressable style={[s.claimSheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            <Display variant="d3" color={theme.text}>{t('programs.claimTitle', { defaultValue: 'Enter a program code' })}</Display>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="XXXXXXXX"
              placeholderTextColor={theme.textMuted}
              style={[s.codeInput, { color: theme.text, backgroundColor: theme.cardAlt, borderColor: theme.border }]}
            />
            <Button variant="solid" label={t('programs.claim', { defaultValue: 'Claim program' })} icon="checkmark" onPress={submitClaim} disabled={!code.trim() || claiming} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  programCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1 },
  programIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#03110D' },
  activePillText: { fontFamily: Fonts.bold, fontSize: 11, color: '#03110D', letterSpacing: 0.3 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  filterPillText: { fontFamily: Fonts.semibold, fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  trashBtn: { padding: 6 },
  inviteCard: { borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1 },
  inviteTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inviteMeta: { fontFamily: Fonts.medium, fontSize: 12.5, marginTop: 3 },
  inviteActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 28 },
  claimSheet: { borderRadius: 22, padding: 20, gap: 14 },
  codeInput: { height: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontFamily: Fonts.monoBold, fontSize: 20, letterSpacing: 3, textAlign: 'center' },
});
