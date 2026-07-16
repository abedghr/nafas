import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, Modal, TextInput, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
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
    s === 'confirmed' ? { c: Colors.primary, bg: Colors.primary + '20', k: 'reg_confirmed' }
    : s === 'rejected' ? { c: Colors.accent, bg: Colors.accent + '20', k: 'rejected' }
    : s === 'cancelled' ? { c: theme.textMuted, bg: theme.border, k: 'cancelled' }
    : { c: '#E0A800', bg: '#FFD93D22', k: 'reg_pending' };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.event_registrants')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>
      ) : events.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>{t('discover.no_managed_events')}</Text>
      ) : (
        <View style={{ flex: 1 }}>
          {/* event selector — one event at a time, never mixed */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evScroll} contentContainerStyle={styles.evRow}>
            {events.map((ev) => {
              const on = ev.id === selEventId;
              const pend = pendingCount.get(ev.id) || 0;
              return (
                <Pressable key={ev.id} onPress={() => { Haptics.selectionAsync(); setSelEventId(ev.id); }} style={[styles.evChip, { backgroundColor: on ? Colors.primary : theme.card, borderColor: on ? Colors.primary : theme.border }]}>
                  <Text style={[styles.evChipText, { color: on ? '#fff' : theme.text }]} numberOfLines={1}>{ev.name}</Text>
                  {pend > 0 && <View style={[styles.evBadge, { backgroundColor: on ? '#fff' : Colors.accent }]}><Text style={[styles.evBadgeText, { color: on ? Colors.primary : '#fff' }]}>{pend}</Text></View>}
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
                  <Text style={[styles.groupTitle, { color: theme.text }]} numberOfLines={1}>{ev.name}</Text>
                  <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWalkEvent(ev); setQ(''); setHits([]); }} style={[styles.addBtn, { backgroundColor: Colors.primary + '18' }]}>
                    <Ionicons name="person-add" size={15} color={Colors.primary} />
                    <Text style={[styles.addBtnText, { color: Colors.primary }]}>{t('discover.add_walk_in')}</Text>
                  </Pressable>
                </View>
                <View style={[styles.summary, { backgroundColor: theme.card }]}>
                  <View style={styles.sumItem}><Text style={[styles.sumV, { color: theme.text }]}>{confirmed.length}</Text><Text style={[styles.sumL, { color: theme.textMuted }]}>{t('discover.expected')}</Text></View>
                  <View style={styles.sumItem}><Text style={[styles.sumV, { color: Colors.primary }]}>{paidRegs.length}</Text><Text style={[styles.sumL, { color: theme.textMuted }]}>{t('discover.paid')}</Text></View>
                  <View style={styles.sumItem}><Text style={[styles.sumV, { color: theme.text }]}>{collected} {cur(ev)}</Text><Text style={[styles.sumL, { color: theme.textMuted }]}>{t('discover.collected')}</Text></View>
                </View>

                {selRegs.length === 0 && <Text style={[styles.empty, { color: theme.textMuted, paddingTop: 30 }]}>{t('discover.no_registrants')}</Text>}
                {selRegs.map((r) => {
                  const cs = statusChip(r.status);
                  return (
                    <View key={r.id} style={[styles.card, { backgroundColor: theme.card }]}>
                      <View style={styles.cardHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.name, { color: theme.text }]}>
                            {r.userName}{r.addedBy ? <Text style={[styles.walkTag, { color: theme.textMuted }]}>  · {t('discover.walk_in')}</Text> : null}
                          </Text>
                          {!!r.note && <Text style={[styles.sub, { color: theme.textMuted }]}>{r.note}</Text>}
                        </View>
                        <View style={styles.chipCol}>
                          <View style={[styles.statusChip, { backgroundColor: cs.bg }]}><Text style={[styles.statusText, { color: cs.c }]}>{t(`discover.${cs.k}`)}</Text></View>
                          {r.paid ? (
                            <View style={[styles.paidChip, { backgroundColor: Colors.primary }]}><Ionicons name="cash" size={11} color="#fff" /><Text style={styles.paidChipText}>{r.amountPaid} {cur(ev)}</Text></View>
                          ) : !ev.isFree ? (
                            <View style={[styles.paidChip, { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }]}><Text style={[styles.paidChipText, { color: theme.textMuted }]}>{t('discover.unpaid')}</Text></View>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.actions}>
                        {r.status !== 'confirmed' && <Pressable onPress={() => setStatus(r.id, 'confirmed')} style={[styles.btn, { borderColor: Colors.primary }]}><Ionicons name="checkmark" size={14} color={Colors.primary} /><Text style={[styles.btnText, { color: Colors.primary }]}>{t('discover.approve')}</Text></Pressable>}
                        {r.status !== 'rejected' && <Pressable onPress={() => setStatus(r.id, 'rejected')} style={[styles.btn, { borderColor: theme.border }]}><Ionicons name="close" size={14} color={theme.textMuted} /><Text style={[styles.btnText, { color: theme.textMuted }]}>{t('discover.reject')}</Text></Pressable>}
                        {!ev.isFree && (r.paid
                          ? <Pressable onPress={() => openPay(r, ev)} style={[styles.btn, { borderColor: theme.border }]}><Ionicons name="create-outline" size={14} color={theme.text} /><Text style={[styles.btnText, { color: theme.text }]}>{t('discover.edit_payment')}</Text></Pressable>
                          : <Pressable onPress={() => openPay(r, ev)} style={[styles.btn, styles.btnFilled, { backgroundColor: Colors.primary, borderColor: Colors.primary }]}><Ionicons name="cash-outline" size={14} color="#fff" /><Text style={[styles.btnText, { color: '#fff' }]}>{t('discover.mark_paid')}</Text></Pressable>)}
                        {!!r.userPhone && <Pressable onPress={() => Linking.openURL(`tel:${r.userPhone}`)} style={[styles.btn, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /></Pressable>}
                      </View>
                    </View>
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
                <Text style={[styles.sheetTitle, { color: theme.text }]}>{t('discover.record_payment')}</Text>
                <Text style={[styles.sheetSub, { color: theme.textMuted }]}>{payReg.userName} · {ev?.name}</Text>

                {(ev?.priceTiers?.length ?? 0) > 0 && (
                  <>
                    <Text style={[styles.fieldLbl, { color: theme.textSecondary }]}>{t('discover.select_tier')}</Text>
                    <View style={styles.tierRow}>
                      {ev!.priceTiers!.map((tr) => {
                        const on = payTier === tr.label;
                        return (
                          <Pressable key={tr.label} onPress={() => pickTier(ev!, tr.label)} style={[styles.tier, { backgroundColor: on ? Colors.primary : theme.background, borderColor: on ? Colors.primary : theme.border }]}>
                            <Text style={[styles.tierName, { color: on ? '#fff' : theme.text }]}>{tr.label}</Text>
                            <Text style={[styles.tierAmt, { color: on ? '#fff' : theme.textMuted }]}>{tr.amount} {cur(ev)}</Text>
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

                <Pressable onPress={confirmPay} style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmText}>{payReg.paid ? t('discover.update_payment') : t('discover.confirm_paid')}</Text>
                </Pressable>
                {payReg.paid && (
                  <Pressable onPress={() => { undoPay(payReg); setPayReg(null); }} style={styles.undoBtn}>
                    <Text style={[styles.undoText, { color: Colors.accent }]}>{t('discover.mark_unpaid')}</Text>
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
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{t('discover.add_walk_in')}</Text>
            <Text style={[styles.sheetSub, { color: theme.textMuted }]}>{walkEvent?.name}</Text>
            <View style={[styles.searchWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="search" size={18} color={theme.textMuted} />
              <TextInput style={[styles.searchInput, { color: theme.text }]} value={q} onChangeText={setQ} placeholder={t('discover.search_user')} placeholderTextColor={theme.textMuted} autoFocus autoCapitalize="none" />
              {searching && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {q.trim().length >= 2 && hits.length === 0 && !searching && <Text style={[styles.empty, { color: theme.textMuted, paddingTop: 24 }]}>{t('discover.no_users')}</Text>}
              {hits.map((u) => (
                <Pressable key={u.id} onPress={() => addWalkIn(u)} style={[styles.hitRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.hitAvatar, { backgroundColor: Colors.primary + '20' }]}><Text style={[styles.hitInitial, { color: Colors.primary }]}>{u.name?.charAt(0) || '?'}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hitName, { color: theme.text }]}>{u.name}</Text>
                    <Text style={[styles.hitSub, { color: theme.textMuted }]}>@{u.username} · {u.email}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={Colors.primary} />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  empty: { textAlign: 'center', paddingTop: 60, fontSize: 15, fontFamily: 'Rubik_500Medium' },
  evScroll: { flexGrow: 0, maxHeight: 52, marginBottom: 6 },
  evRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  evChip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 220, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  evChipText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  evBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  evBadgeText: { fontSize: 10, fontFamily: 'Rubik_700Bold' },
  gymCtx: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginBottom: 8 },
  group: { marginBottom: 20 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  groupTitle: { fontSize: 17, fontFamily: 'Rubik_700Bold', flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  addBtnText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  summary: { flexDirection: 'row', borderRadius: 12, padding: 12, marginBottom: 10 },
  sumItem: { flex: 1, alignItems: 'center', gap: 2 },
  sumV: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  sumL: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  card: { borderRadius: 14, padding: 14, marginBottom: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  walkTag: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  chipCol: { alignItems: 'flex-end', gap: 5 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
  paidChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  paidChipText: { fontSize: 11, fontFamily: 'Rubik_700Bold', color: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  btnFilled: { borderWidth: 1.5 },
  btnText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  // modals
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 10 },
  walkSheet: { minHeight: 420 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  sheetSub: { fontSize: 13, fontFamily: 'Rubik_400Regular', marginTop: 2, marginBottom: 16 },
  fieldLbl: { fontSize: 12, fontFamily: 'Rubik_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tier: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 2 },
  tierName: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  tierAmt: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 54, marginBottom: 12 },
  amountInput: { flex: 1, fontSize: 22, fontFamily: 'Rubik_700Bold' },
  amountCur: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  histToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  histToggleText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  histRow: { paddingVertical: 6, paddingLeft: 20 },
  histText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  histMeta: { fontSize: 10, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  confirmText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  undoBtn: { alignItems: 'center', paddingVertical: 12 },
  undoText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  hitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  hitAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hitInitial: { fontSize: 17, fontFamily: 'Rubik_700Bold' },
  hitName: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  hitSub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 1 },
});
