import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import DateTimeField from '@/components/DateTimeField';
import { eventsApi, type ApiEvent } from '@/src/features/events/api';
import { gymsApi, type ManagedGym } from '@/src/features/gyms/api';

const TYPES = ['tournament', 'event', 'challenge'] as const;
type TierDraft = { label: string; amount: string };
type Draft = { id?: string; name: string; type: string; gymId: string | null; venue: string; startsAt: string; endsAt: string; capacity: string; description: string; isFree: boolean; currency: string; tiers: TierDraft[] };

export default function ManageEventsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [items, setItems] = useState<ApiEvent[]>([]);
  const [gyms, setGyms] = useState<ManagedGym[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);

  const load = () => eventsApi.managed().then(setItems).catch(() => {});
  useEffect(() => { load(); gymsApi.managed().then(setGyms).catch(() => {}); }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  const openNew = () => setDraft({ name: '', type: 'tournament', gymId: gyms[0]?.id ?? null, venue: '', startsAt: '', endsAt: '', capacity: '', description: '', isFree: true, currency: 'JOD', tiers: [{ label: 'Standard', amount: '' }] });
  const openEdit = (e: ApiEvent) => setDraft({ id: e.id, name: e.name, type: e.type, gymId: e.gymId, venue: e.venue || '', startsAt: e.startsAt || '', endsAt: e.endsAt || '', capacity: e.capacity ? String(e.capacity) : '', description: e.description || '', isFree: e.isFree ?? true, currency: e.currency || 'JOD', tiers: (e.priceTiers || []).map((tr) => ({ label: tr.label, amount: String(tr.amount) })) });

  const setTier = (i: number, patch: Partial<TierDraft>) => setDraft((d) => d ? { ...d, tiers: d.tiers.map((tr, ix) => ix === i ? { ...tr, ...patch } : tr) } : d);
  const addTier = () => setDraft((d) => d ? { ...d, tiers: [...d.tiers, { label: '', amount: '' }] } : d);
  const removeTier = (i: number) => setDraft((d) => d ? { ...d, tiers: d.tiers.filter((_, ix) => ix !== i) } : d);

  const save = async () => {
    if (!draft?.name.trim()) return;
    const tiers = draft.isFree ? [] : draft.tiers.filter((tr) => tr.label.trim()).map((tr) => ({ label: tr.label.trim(), amount: Number(tr.amount) || 0 }));
    const body = { name: draft.name.trim(), type: draft.type, gymId: draft.gymId, venue: draft.venue.trim(), startsAt: draft.startsAt || null, endsAt: draft.endsAt || null, capacity: draft.capacity ? Number(draft.capacity) : 0, description: draft.description.trim(), isFree: draft.isFree, currency: draft.currency.trim().toUpperCase() || 'JOD', priceTiers: tiers };
    try {
      if (draft.id) await eventsApi.update(draft.id, body); else await eventsApi.create(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDraft(null); load();
    } catch {}
  };
  const remove = async (id: string) => { await eventsApi.remove(id).catch(() => {}); load(); };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.manage_events')}</Text>
        <Pressable onPress={openNew} style={styles.backBtn}><Ionicons name="add" size={26} color={Colors.primary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.length === 0 && <Text style={[styles.empty, { color: theme.textMuted }]}>{t('discover.no_managed_events')}</Text>}
        {items.map((e) => (
          <View key={e.id} style={[styles.card, { backgroundColor: theme.card }]}>
            <Pressable onPress={() => router.push(`/event-profile/${e.id}` as any)} style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{e.name}</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>{t(`discover.event_type_${e.type}`)}{e.gymName ? ` · ${e.gymName}` : ''}</Text>
            </Pressable>
            <Pressable onPress={() => openEdit(e)} style={styles.actionBtn}><Ionicons name="pencil" size={16} color={theme.textSecondary} /></Pressable>
            <Pressable onPress={() => remove(e.id)} style={styles.actionBtn}><Ionicons name="trash-outline" size={16} color={Colors.accent} /></Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!draft} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{draft?.id ? t('discover.edit_event') : t('discover.add_event')}</Text>
              <Pressable onPress={() => setDraft(null)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            {draft && (
              <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ gap: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Field label={t('discover.event_name')} value={draft.name} onChange={(v: string) => setDraft({ ...draft, name: v })} theme={theme} />
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('discover.event_type')}</Text>
                  <View style={styles.chips}>
                    {TYPES.map(ty => (
                      <Pressable key={ty} onPress={() => setDraft({ ...draft, type: ty })} style={[styles.chip, { borderColor: draft.type === ty ? Colors.primary : theme.border, backgroundColor: draft.type === ty ? Colors.primary + '20' : 'transparent' }]}>
                        <Text style={[styles.chipText, { color: draft.type === ty ? Colors.primary : theme.textMuted }]}>{t(`discover.event_type_${ty}`)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('discover.host_gym')}</Text>
                  <View style={styles.chips}>
                    <Pressable onPress={() => setDraft({ ...draft, gymId: null })} style={[styles.chip, { borderColor: !draft.gymId ? Colors.primary : theme.border, backgroundColor: !draft.gymId ? Colors.primary + '20' : 'transparent' }]}>
                      <Text style={[styles.chipText, { color: !draft.gymId ? Colors.primary : theme.textMuted }]}>{t('discover.no_gym')}</Text>
                    </Pressable>
                    {gyms.map(g => (
                      <Pressable key={g.id} onPress={() => setDraft({ ...draft, gymId: g.id })} style={[styles.chip, { borderColor: draft.gymId === g.id ? Colors.primary : theme.border, backgroundColor: draft.gymId === g.id ? Colors.primary + '20' : 'transparent' }]}>
                        <Text style={[styles.chipText, { color: draft.gymId === g.id ? Colors.primary : theme.textMuted }]}>{g.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <Field label={t('discover.venue')} value={draft.venue} onChange={(v: string) => setDraft({ ...draft, venue: v })} theme={theme} />
                <DateTimeField label={t('discover.starts_at')} value={draft.startsAt || null} onChange={(v) => setDraft({ ...draft, startsAt: v || '' })} theme={theme} minDate={new Date()} />
                <DateTimeField label={t('discover.ends_at')} value={draft.endsAt || null} onChange={(v) => setDraft({ ...draft, endsAt: v || '' })} theme={theme} minDate={draft.startsAt ? new Date(draft.startsAt) : new Date()} optional />
                <Field label={t('discover.capacity')} value={draft.capacity} onChange={(v: string) => setDraft({ ...draft, capacity: v.replace(/[^0-9]/g, '') })} theme={theme} keyboard="number-pad" />
                <Field label={t('discover.description')} value={draft.description} onChange={(v: string) => setDraft({ ...draft, description: v })} theme={theme} multiline />

                {/* pricing */}
                <View>
                  <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('discover.entry')}</Text>
                  <View style={styles.chips}>
                    <Pressable onPress={() => setDraft({ ...draft, isFree: true })} style={[styles.chip, { borderColor: draft.isFree ? Colors.primary : theme.border, backgroundColor: draft.isFree ? Colors.primary + '20' : 'transparent' }]}>
                      <Text style={[styles.chipText, { color: draft.isFree ? Colors.primary : theme.textMuted }]}>{t('discover.free_entry')}</Text>
                    </Pressable>
                    <Pressable onPress={() => setDraft({ ...draft, isFree: false })} style={[styles.chip, { borderColor: !draft.isFree ? Colors.primary : theme.border, backgroundColor: !draft.isFree ? Colors.primary + '20' : 'transparent' }]}>
                      <Text style={[styles.chipText, { color: !draft.isFree ? Colors.primary : theme.textMuted }]}>{t('discover.paid')}</Text>
                    </Pressable>
                  </View>
                </View>
                {!draft.isFree && (
                  <View style={{ gap: 10 }}>
                    <View style={{ width: 120 }}>
                      <Field label={t('discover.currency')} value={draft.currency} onChange={(v: string) => setDraft({ ...draft, currency: v.toUpperCase().slice(0, 3) })} theme={theme} />
                    </View>
                    <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{t('discover.price_tiers')}</Text>
                    {draft.tiers.map((tr, i) => (
                      <View key={i} style={styles.tierRow}>
                        <TextInput style={[styles.input, styles.tierLabel, { color: theme.text, backgroundColor: theme.card }]} value={tr.label} onChangeText={(v) => setTier(i, { label: v })} placeholder={t('discover.tier_label')} placeholderTextColor={theme.textMuted} />
                        <TextInput style={[styles.input, styles.tierAmount, { color: theme.text, backgroundColor: theme.card }]} value={tr.amount} onChangeText={(v) => setTier(i, { amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textMuted} />
                        <Pressable onPress={() => removeTier(i)} style={styles.tierDel}><Ionicons name="close-circle" size={22} color={theme.textMuted} /></Pressable>
                      </View>
                    ))}
                    <Pressable onPress={addTier} style={[styles.addTier, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={Colors.primary} /><Text style={[styles.addTierText, { color: Colors.primary }]}>{t('discover.add_tier')}</Text></Pressable>
                  </View>
                )}

                <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: Colors.primary }]}><Text style={styles.saveText}>{t('discover.save')}</Text></Pressable>
              </KeyboardAwareScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, theme, multiline, keyboard, placeholder }: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput style={[styles.input, { color: theme.text, backgroundColor: theme.card }, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard || 'default'} placeholder={placeholder} placeholderTextColor={theme.textMuted} autoCapitalize="none" />
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 16 },
  name: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  fieldLabel: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierLabel: { flex: 1 },
  tierAmount: { width: 90, textAlign: 'center' },
  tierDel: { padding: 2 },
  addTier: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  addTierText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
});
