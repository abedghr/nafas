import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, StatTile, CountUp, EmptyState, Skeleton } from '@/components/ui';
import { eventsApi, type EventRegistrant, type ApiEvent } from '@/src/features/events/api';
import { authApi } from '@/src/features/auth/api';

type Tier = { label: string; amount: number };
type UserHit = { id: string; name: string; username: string; email: string; avatarUrl: string | null };

export default function EventRegistrantsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [items, setItems] = useState<EventRegistrant[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selEventId, setSelEventId] = useState<string | null>(null);

  // pay modal state
  const [payReg, setPayReg] = useState<EventRegistrant | null>(null);
  const [payTier, setPayTier] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // walk-in modal state
  const [walkEvent, setWalkEvent] = useState<ApiEvent | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);

  const load = () => Promise.all([eventsApi.registrants(), eventsApi.managed()])
    .then(([regs, evs]) => { setItems(regs); setEvents(evs); setSelEventId((cur) => cur && evs.some((e) => e.id === cur) ? cur : (evs[0]?.id ?? null)); })
    .catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const selEvent = events.find((e) => e.id === selEventId) || null;
  const selRegs = useMemo(() => items.filter((r) => r.eventId === selEventId), [items, selEventId]);
  const pendingCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of items) if (r.status === 'pending') m.set(r.eventId, (m.get(r.eventId) || 0) + 1);
    return m;
  }, [items]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const cur = (ev?: ApiEvent) => ev?.currency || 'JOD';

  const setStatus = async (id: string, status: string) => {
    Haptics.selectionAsync();
    await eventsApi.updateRegistrant(id, { status }).catch(() => {});
    load();
  };

  // ── payment ──
  const openPay = (r: EventRegistrant, ev?: ApiEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPayReg(r); setShowHistory(false);
    const tier = r.tierLabel ?? ev?.priceTiers?.[0]?.label ?? null;
    setPayTier(tier);
    const amt = r.amountPaid != null ? r.amountPaid : (ev?.priceTiers?.find((x) => x.label === tier)?.amount ?? 0);
    setPayAmount(String(amt));
  };
  const pickTier = (ev: ApiEvent, tl: string) => {
    Haptics.selectionAsync();
    setPayTier(tl);
    const tier = ev.priceTiers?.find((x) => x.label === tl);
    if (tier) setPayAmount(String(tier.amount));
  };
  const confirmPay = async () => {
    if (!payReg) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await eventsApi.updateRegistrant(payReg.id, { paid: true, tierLabel: payTier, amountPaid: Number(payAmount) || 0, status: 'confirmed' }).catch(() => {});
    setPayReg(null); load();
  };
  const undoPay = async (r: EventRegistrant) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await eventsApi.updateRegistrant(r.id, { paid: false }).catch(() => {});
    load();
  };

  // ── walk-in ──
  useEffect(() => {
    if (!walkEvent) return;
    if (q.trim().length < 2) { setHits([]); return; }
    let active = true; setSearching(true);
    const id = setTimeout(() => {
      authApi.searchUsers(q.trim()).then((r) => active && setHits(r)).catch(() => active && setHits([])).finally(() => active && setSearching(false));
    }, 250);
    return () => { active = false; clearTimeout(id); };
  }, [q, walkEvent]);
  const addWalkIn = async (u: UserHit) => {
    if (!walkEvent) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await eventsApi.addRegistrant(walkEvent.id, u.id).catch(() => {});
    setWalkEvent(null); setQ(''); setHits([]); load();
  };

  const statusChip = (s: string) =>
    s === 'confirmed' ? { c: Colors.electric, k: 'reg_confirmed' }
    : s === 'rejected' ? { c: Colors.semantic.danger, k: 'rejected' }
    : s === 'cancelled' ? { c: theme.textMuted, k: 'cancelled' }
    : { c: Colors.semantic.warn, k: 'reg_pending' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 12 : insets.top + 12 }]}>
        <Pressable onPress={back} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('discover.event_registrants')}</Display>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.loadWrap}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 12 }]}>
              <View style={styles.cardHead}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="35%" height={12} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : events.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <EmptyState icon="calendar-outline" title={t('discover.no_managed_events')} />
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* event selector — one event at a time, never mixed */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evScroll} contentContainerStyle={styles.evRow}>
            {events.map((ev) => {
              const on = ev.id === selEventId;
              const pend = pendingCount.get(ev.id) || 0;
              return (
                <Pressable key={ev.id} onPress={() => { Haptics.selectionAsync(); setSelEventId(ev.id); }} style={[styles.evChip, { backgroundColor: on ? Colors.electric : theme.card, borderColor: on ? Colors.electric : theme.border }]}>
                  <Text style={[styles.evChipText, { color: on ? '#04120B' : theme.textSecondary }]} numberOfLines={1}>{ev.name}</Text>
                  {pend > 0 && <View style={[styles.evBadge, { backgroundColor: on ? '#04120B' : Colors.semantic.warn }]}><Text style={[styles.evBadgeText, { color: on ? Colors.electric : '#04120B' }]}>{pend}</Text></View>}
                </Pressable>
              );
            })}
          </ScrollView>

          {selEvent && (() => {
            const ev = selEvent;
            const confirmed = selRegs.filter((r) => r.status === 'confirmed');
            const paidRegs = selRegs.filter((r) => r.paid);
            const collected = paidRegs.reduce((s, r) => s + (r.amountPaid || 0), 0);
            return (
              <ScrollView contentContainerStyle={styles.list}>
                {!!ev.gymName && <Text style={[styles.gymCtx, { color: theme.textMuted }]}><Ionicons name="business-outline" size={12} color={theme.textMuted} /> {ev.gymName}</Text>}
                <View style={styles.groupHead}>
                  <Display variant="d3" color={theme.text} numberOfLines={1} style={{ flex: 1 }}>{ev.name}</Display>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWalkEvent(ev); setQ(''); setHits([]); }} style={[styles.addBtn, { backgroundColor: Colors.electric + '18' }]}>
                    <Ionicons name="person-add" size={15} color={Colors.electric} />
                    <Text style={[styles.addBtnText, { color: Colors.electric }]}>{t('discover.add_walk_in')}</Text>
                  </Pressable>
                </View>

                <View style={styles.summary}>
                  <StatTile icon="people-outline" value={<CountUp value={confirmed.length} style={[styles.statVal, { color: theme.text }]} />} label={t('discover.expected')} />
                  <StatTile icon="cash-outline" color={Colors.electric} value={<CountUp value={paidRegs.length} style={[styles.statVal, { color: theme.text }]} />} label={t('discover.paid')} />
                  <StatTile icon="wallet-outline" color={Colors.electric} value={<Text style={[Type.statSm, { color: theme.text }]}>{collected} {cur(ev)}</Text>} label={t('discover.collected')} />
                </View>

                {selRegs.length === 0 && <EmptyState icon="people-outline" title={t('discover.no_registrants')} />}
                {selRegs.map((r, i) => {
                  const cs = statusChip(r.status);
                  const initial = (r.userName?.trim()?.charAt(0) || '?').toUpperCase();
                  return (
                    <Animated.View key={r.id} entering={FadeInDown.delay(60 + i * 50).duration(400)} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={styles.cardHead}>
                        <View style={[styles.avatar, { backgroundColor: Colors.electric + '22' }]}>
                          <Text style={[styles.avatarText, { color: Colors.electric }]}>{initial}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[Type.h2, { color: theme.text }]} numberOfLines={1}>
                            {r.userName}{r.addedBy ? <Text style={[styles.walkTag, { color: theme.textMuted }]}>  · {t('discover.walk_in')}</Text> : null}
                          </Text>
                          {!!r.note && <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>{r.note}</Text>}
                        </View>
                        <View style={styles.chipCol}>
                          <View style={[styles.statusChip, { backgroundColor: cs.c + '20' }]}>
                            <View style={[styles.statusDot, { backgroundColor: cs.c }]} />
                            <Text style={[styles.statusText, { color: cs.c }]}>{t(`discover.${cs.k}`)}</Text>
                          </View>
                          {r.paid ? (
                            <View style={[styles.paidChip, { backgroundColor: Colors.electric }]}><Ionicons name="cash" size={11} color="#04120B" /><Text style={styles.paidChipText}>{r.amountPaid} {cur(ev)}</Text></View>
                          ) : !ev.isFree ? (
                            <View style={[styles.paidChip, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }]}><Text style={[styles.paidChipText, { color: theme.textMuted }]}>{t('discover.unpaid')}</Text></View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.actions}>
                        {r.status !== 'confirmed' && <Pressable onPress={() => setStatus(r.id, 'confirmed')} style={[styles.pill, { borderColor: Colors.electric }]}><Ionicons name="checkmark" size={14} color={Colors.electric} /><Text style={[styles.pillText, { color: Colors.electric }]}>{t('discover.approve')}</Text></Pressable>}
                        {r.status !== 'rejected' && <Pressable onPress={() => setStatus(r.id, 'rejected')} style={[styles.pill, { borderColor: theme.border }]}><Ionicons name="close" size={14} color={Colors.semantic.danger} /><Text style={[styles.pillText, { color: Colors.semantic.danger }]}>{t('discover.reject')}</Text></Pressable>}
                        {!ev.isFree && (r.paid
                          ? <Pressable onPress={() => openPay(r, ev)} style={[styles.pill, { borderColor: theme.border }]}><Ionicons name="create-outline" size={14} color={theme.text} /><Text style={[styles.pillText, { color: theme.text }]}>{t('discover.edit_payment')}</Text></Pressable>
                          : <Pressable onPress={() => openPay(r, ev)} style={[styles.pill, styles.pillFilled, { backgroundColor: Colors.electric, borderColor: Colors.electric }]}><Ionicons name="cash-outline" size={14} color="#04120B" /><Text style={[styles.pillText, { color: '#04120B' }]}>{t('discover.mark_paid')}</Text></Pressable>)}
                        {!!r.userPhone && <Pressable onPress={() => Linking.openURL(`tel:${r.userPhone}`)} style={[styles.pill, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /></Pressable>}
                      </View>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            );
          })()}
        </View>
      )}

      {/* ── Mark-paid modal ── */}
      <Modal visible={!!payReg} transparent animationType="slide" onRequestClose={() => setPayReg(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPayReg(null)} />
          {payReg && (() => {
            const ev = eventsById.get(payReg.eventId);
            return (
              <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 16 }]}>
                <View style={styles.sheetHandle} />
                <Display variant="d3" color={theme.text}>{t('discover.record_payment')}</Display>
                <Text style={[styles.sheetSub, { color: theme.textMuted }]}>{payReg.userName} · {ev?.name}</Text>

                {(ev?.priceTiers?.length ?? 0) > 0 && (
                  <>
                    <Text style={[styles.fieldLbl, { color: theme.textSecondary }]}>{t('discover.select_tier')}</Text>
                    <View style={styles.tierRow}>
                      {ev!.priceTiers!.map((tr) => {
                        const on = payTier === tr.label;
                        return (
                          <Pressable key={tr.label} onPress={() => pickTier(ev!, tr.label)} style={[styles.tier, { backgroundColor: on ? Colors.electric : theme.background, borderColor: on ? Colors.electric : theme.border }]}>
                            <Text style={[styles.tierName, { color: on ? '#04120B' : theme.text }]}>{tr.label}</Text>
                            <Text style={[styles.tierAmt, { color: on ? '#04120B' : theme.textMuted }]}>{tr.amount} {cur(ev)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={[styles.fieldLbl, { color: theme.textSecondary }]}>{t('discover.amount_collected')}</Text>
                <View style={[styles.amountWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <TextInput style={[styles.amountInput, { color: theme.text }]} value={payAmount} onChangeText={(v) => setPayAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textMuted} />
                  <Text style={[styles.amountCur, { color: theme.textMuted }]}>{cur(ev)}</Text>
                </View>

                {payReg.paymentHistory?.length > 0 && (
                  <Pressable onPress={() => setShowHistory((s) => !s)} style={styles.histToggle}>
                    <Ionicons name={showHistory ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.textMuted} />
                    <Text style={[styles.histToggleText, { color: theme.textMuted }]}>{t('discover.payment_history')} ({payReg.paymentHistory.length})</Text>
                  </Pressable>
                )}
                {showHistory && payReg.paymentHistory.map((h, i) => (
                  <View key={i} style={styles.histRow}>
                    <Text style={[styles.histText, { color: theme.textSecondary }]}>{h.action} · {h.amount != null ? `${h.amount} ${cur(ev)}` : '—'}{h.tierLabel ? ` · ${h.tierLabel}` : ''}</Text>
                    <Text style={[styles.histMeta, { color: theme.textMuted }]}>{h.byName || ''} · {new Date(h.at).toLocaleDateString()}</Text>
                  </View>
                ))}

                <Pressable onPress={confirmPay} style={[styles.confirmBtn, { backgroundColor: Colors.electric }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#04120B" />
                  <Text style={styles.confirmText}>{payReg.paid ? t('discover.update_payment') : t('discover.confirm_paid')}</Text>
                </Pressable>
                {payReg.paid && (
                  <Pressable onPress={() => { undoPay(payReg); setPayReg(null); }} style={styles.undoBtn}>
                    <Text style={[styles.undoText, { color: Colors.semantic.danger }]}>{t('discover.mark_unpaid')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })()}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Walk-in search modal ── */}
      <Modal visible={!!walkEvent} transparent animationType="slide" onRequestClose={() => setWalkEvent(null)}>
        <KeyboardAvoidingView behavior="padding" style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setWalkEvent(null)} />
          <View style={[styles.sheet, styles.walkSheet, { backgroundColor: theme.card, paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 16 }]}>
            <View style={styles.sheetHandle} />
            <Display variant="d3" color={theme.text}>{t('discover.add_walk_in')}</Display>
            <Text style={[styles.sheetSub, { color: theme.textMuted }]}>{walkEvent?.name}</Text>
            <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput style={[styles.searchInput, { color: theme.text }]} value={q} onChangeText={setQ} placeholder={t('discover.search_user')} placeholderTextColor={theme.textMuted} autoFocus autoCapitalize="none" />
              {searching && <ActivityIndicator size="small" color={Colors.electric} />}
            </View>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {q.trim().length >= 2 && hits.length === 0 && !searching && <Text style={[styles.empty, { color: theme.textMuted, paddingTop: 24 }]}>{t('discover.no_users')}</Text>}
              {hits.map((u) => (
                <Pressable key={u.id} onPress={() => addWalkIn(u)} style={[styles.hitRow, { borderBottomColor: theme.border }]}>
                  {u.avatarUrl
                    ? <Image source={{ uri: u.avatarUrl }} style={styles.hitAvatar} contentFit="cover" />
                    : <View style={[styles.hitAvatar, { backgroundColor: Colors.electric + '22', alignItems: 'center', justifyContent: 'center' }]}><Text style={[styles.hitInitial, { color: Colors.electric }]}>{u.name?.charAt(0) || '?'}</Text></View>}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hitName, { color: theme.text }]}>{u.name}</Text>
                    <Text style={[styles.hitSub, { color: theme.textMuted }]}>@{u.username} · {u.email}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.electric} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadWrap: { paddingHorizontal: 20, paddingTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { textAlign: 'center', paddingTop: 60, fontFamily: Fonts.medium, fontSize: 15 },
  evScroll: { flexGrow: 0, maxHeight: 52, marginBottom: 6 },
  evRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  evChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  evChipText: { fontFamily: Fonts.semibold, fontSize: 13 },
  evBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  evBadgeText: { fontFamily: Fonts.bold, fontSize: 10 },
  gymCtx: { fontFamily: Fonts.medium, fontSize: 12, marginBottom: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  addBtnText: { fontFamily: Fonts.semibold, fontSize: 12 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statVal: { fontSize: 18 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.bold, fontSize: 18 },
  walkTag: { fontFamily: Fonts.regular, fontSize: 11 },
  sub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2 },
  chipCol: { alignItems: 'flex-end', gap: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 26, borderRadius: 999 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Fonts.semibold, fontSize: 11 },
  paidChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  paidChipText: { fontFamily: Fonts.bold, fontSize: 11, color: '#04120B' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, height: 34 },
  pillFilled: { borderWidth: 1.5 },
  pillText: { fontFamily: Fonts.semibold, fontSize: 12 },
  // modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 10 },
  walkSheet: { minHeight: 420 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 14 },
  sheetSub: { fontFamily: Fonts.regular, fontSize: 13, marginTop: 4, marginBottom: 16 },
  fieldLbl: { fontFamily: Fonts.semibold, fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tier: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  tierName: { fontFamily: Fonts.semibold, fontSize: 13 },
  tierAmt: { fontFamily: Fonts.regular, fontSize: 11 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 54, marginBottom: 12 },
  amountInput: { flex: 1, fontFamily: Fonts.monoBold, fontSize: 22 },
  amountCur: { fontFamily: Fonts.medium, fontSize: 14 },
  histToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  histToggleText: { fontFamily: Fonts.medium, fontSize: 12 },
  histRow: { paddingVertical: 6, paddingLeft: 20 },
  histText: { fontFamily: Fonts.medium, fontSize: 12 },
  histMeta: { fontFamily: Fonts.regular, fontSize: 10, marginTop: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 999, marginTop: 8 },
  confirmText: { fontFamily: Fonts.bold, fontSize: 16, color: '#04120B' },
  undoBtn: { alignItems: 'center', paddingVertical: 12 },
  undoText: { fontFamily: Fonts.semibold, fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, marginBottom: 8 },
  searchInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 15 },
  hitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  hitAvatar: { width: 40, height: 40, borderRadius: 20 },
  hitInitial: { fontFamily: Fonts.bold, fontSize: 17 },
  hitName: { fontFamily: Fonts.medium, fontSize: 15 },
  hitSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
});
