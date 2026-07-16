import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput, Image, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { gymsApi, type ManagedGym, type TeamMember, type Facility } from '@/src/features/gyms/api';
import { uploadImageAsync } from '@/src/lib/upload';

type SubDraft = { name: string; amount: string; currency: string };
type Draft = {
  name: string; description: string; phone: string; whatsapp: string; workingHours: string;
  address: string; city: string; logoUrl: string | null; coverUrl: string | null;
  types: string[]; facilityIds: string[]; subs: SubDraft[];
};

export default function ManageGymScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [gyms, setGyms] = useState<ManagedGym[]>([]);
  const [catalog, setCatalog] = useState<Facility[]>([]);
  const [sel, setSel] = useState<ManagedGym | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [typeInput, setTypeInput] = useState('');
  const [team, setTeam] = useState<{ owner: TeamMember | null; members: TeamMember[] } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [teamErr, setTeamErr] = useState('');

  const load = () => gymsApi.managed().then(setGyms).catch(() => {});
  useEffect(() => { load(); gymsApi.facilitiesCatalog().then(setCatalog).catch(() => {}); }, []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  const open = (g: ManagedGym) => {
    setSel(g);
    setDraft({
      name: g.name || '', description: g.description || '', phone: g.phone || '', whatsapp: g.whatsapp || '',
      workingHours: g.workingHours || '', address: g.address || '', city: g.city || '',
      logoUrl: g.logoUrl ?? null, coverUrl: g.coverUrl ?? null,
      types: g.types || [], facilityIds: g.facilityIds || [],
      subs: (g.subscriptions || []).map((s) => ({ name: s.name, amount: String(s.price.amount), currency: s.price.currency })),
    });
    setTypeInput(''); setTeam(null); setNewEmail(''); setTeamErr('');
    gymsApi.team(g.id).then(setTeam).catch(() => {});
  };

  const pickImage = async (key: 'logoUrl' | 'coverUrl') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, aspect: key === 'logoUrl' ? [1, 1] : [16, 9], allowsEditing: true });
    if (res.canceled || !res.assets?.[0]) return;
    try { const url = await uploadImageAsync(res.assets[0].uri); setDraft((d) => d ? { ...d, [key]: url } : d); Haptics.selectionAsync(); } catch {}
  };

  const addType = () => { const v = typeInput.trim(); if (!v || !draft) return; if (!draft.types.includes(v)) setDraft({ ...draft, types: [...draft.types, v] }); setTypeInput(''); };
  const removeType = (ty: string) => draft && setDraft({ ...draft, types: draft.types.filter((x) => x !== ty) });
  const toggleFacility = (id: string) => { if (!draft) return; Haptics.selectionAsync(); setDraft({ ...draft, facilityIds: draft.facilityIds.includes(id) ? draft.facilityIds.filter((x) => x !== id) : [...draft.facilityIds, id] }); };
  const setSub = (i: number, patch: Partial<SubDraft>) => draft && setDraft({ ...draft, subs: draft.subs.map((s, ix) => ix === i ? { ...s, ...patch } : s) });
  const addSub = () => draft && setDraft({ ...draft, subs: [...draft.subs, { name: '', amount: '', currency: 'JOD' }] });
  const removeSub = (i: number) => draft && setDraft({ ...draft, subs: draft.subs.filter((_, ix) => ix !== i) });

  const save = async () => {
    if (!sel || !draft || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const patch = {
      name: draft.name.trim() || sel.name, description: draft.description.trim(),
      phone: draft.phone.trim() || null, whatsapp: draft.whatsapp.trim() || null,
      workingHours: draft.workingHours.trim() || null, address: draft.address.trim(), city: draft.city.trim() || null,
      logoUrl: draft.logoUrl, coverUrl: draft.coverUrl, types: draft.types, facilityIds: draft.facilityIds,
      subscriptions: draft.subs.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), price: { amount: Number(s.amount) || 0, currency: (s.currency || 'JOD').toUpperCase() } })),
    };
    try { await gymsApi.updateManaged(sel.id, patch); setSel(null); load(); } catch {} finally { setSaving(false); }
  };

  const addManager = async () => {
    if (!sel || !newEmail.trim()) return;
    setTeamErr('');
    try { await gymsApi.addManager(sel.id, newEmail.trim()); setNewEmail(''); gymsApi.team(sel.id).then(setTeam); }
    catch { setTeamErr(t('discover.manager_not_found')); }
  };
  const removeManager = async (memberId: string) => {
    if (!sel) return;
    await gymsApi.removeManager(sel.id, memberId).catch(() => {});
    gymsApi.team(sel.id).then(setTeam);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.manage_gym')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {gyms.length === 0 && <Text style={[styles.empty, { color: theme.textMuted }]}>{t('discover.no_managed_gyms')}</Text>}
        {gyms.map((g) => (
          <Pressable key={g.id} onPress={() => open(g)} style={[styles.card, { backgroundColor: theme.card }]}>
            {g.logoUrl ? <Image source={{ uri: g.logoUrl }} style={styles.cardLogo} /> : <View style={[styles.cardLogo, { backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="business" size={18} color={Colors.primary} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{g.name}</Text>
              <Text style={[styles.sub, { color: theme.textMuted }]}>{g.city || g.address}</Text>
            </View>
            <View style={[styles.roleChip, { backgroundColor: g.isOwner ? Colors.primary + '20' : theme.background }]}>
              <Text style={[styles.roleText, { color: g.isOwner ? Colors.primary : theme.textMuted }]}>{t(g.isOwner ? 'discover.role_owner' : 'discover.role_manager')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>{sel?.name}</Text>
              <Pressable onPress={() => setSel(null)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            {draft && (
              <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Media */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.media')}</Text>
                <View style={styles.mediaRow}>
                  <ImageBox label={t('discover.logo')} url={draft.logoUrl} onPick={() => pickImage('logoUrl')} onClear={() => setDraft({ ...draft, logoUrl: null })} theme={theme} square />
                  <ImageBox label={t('discover.cover')} url={draft.coverUrl} onPick={() => pickImage('coverUrl')} onClear={() => setDraft({ ...draft, coverUrl: null })} theme={theme} />
                </View>

                {/* Basics */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.basics')}</Text>
                <Field label={t('discover.gym_name')} value={draft.name} onChange={(v: string) => setDraft({ ...draft, name: v })} theme={theme} />
                <Field label={t('discover.description')} value={draft.description} onChange={(v: string) => setDraft({ ...draft, description: v })} theme={theme} multiline />

                {/* Contact */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.contact')}</Text>
                <Field label={t('discover.phone')} value={draft.phone} onChange={(v: string) => setDraft({ ...draft, phone: v })} theme={theme} keyboard="phone-pad" />
                <Field label={t('discover.whatsapp')} value={draft.whatsapp} onChange={(v: string) => setDraft({ ...draft, whatsapp: v })} theme={theme} keyboard="phone-pad" />
                <Field label={t('discover.working_hours')} value={draft.workingHours} onChange={(v: string) => setDraft({ ...draft, workingHours: v })} theme={theme} />

                {/* Location */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.location')}</Text>
                <Field label={t('discover.address')} value={draft.address} onChange={(v: string) => setDraft({ ...draft, address: v })} theme={theme} />
                <Field label={t('discover.city')} value={draft.city} onChange={(v: string) => setDraft({ ...draft, city: v })} theme={theme} />

                {/* Types */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.gym_types')}</Text>
                <View style={styles.chipWrap}>
                  {draft.types.map((ty) => (
                    <Pressable key={ty} onPress={() => removeType(ty)} style={[styles.chip, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary }]}>
                      <Text style={[styles.chipText, { color: Colors.primary }]}>{ty}</Text>
                      <Ionicons name="close" size={13} color={Colors.primary} />
                    </Pressable>
                  ))}
                </View>
                <View style={styles.addRow}>
                  <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card }]} value={typeInput} onChangeText={setTypeInput} onSubmitEditing={addType} placeholder={t('discover.add_type')} placeholderTextColor={theme.textMuted} />
                  <Pressable onPress={addType} style={[styles.addBtn, { backgroundColor: Colors.primary }]}><Ionicons name="add" size={20} color="#fff" /></Pressable>
                </View>

                {/* Facilities */}
                {catalog.length > 0 && (
                  <>
                    <Text style={[styles.section, { color: theme.text }]}>{t('discover.facilities')}</Text>
                    <View style={styles.chipWrap}>
                      {catalog.map((f) => {
                        const on = draft.facilityIds.includes(f.id);
                        return (
                          <Pressable key={f.id} onPress={() => toggleFacility(f.id)} style={[styles.chip, { backgroundColor: on ? Colors.primary + '20' : theme.card, borderColor: on ? Colors.primary : theme.border }]}>
                            <Ionicons name={(f.icon || 'ellipse-outline') as any} size={14} color={on ? Colors.primary : theme.textMuted} />
                            <Text style={[styles.chipText, { color: on ? Colors.primary : theme.textSecondary }]}>{f.title}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Subscriptions */}
                <Text style={[styles.section, { color: theme.text }]}>{t('discover.membership_plans')}</Text>
                {draft.subs.map((s, i) => (
                  <View key={i} style={styles.subRow}>
                    <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card }]} value={s.name} onChangeText={(v) => setSub(i, { name: v })} placeholder={t('discover.plan_name')} placeholderTextColor={theme.textMuted} />
                    <TextInput style={[styles.input, styles.subAmount, { color: theme.text, backgroundColor: theme.card }]} value={s.amount} onChangeText={(v) => setSub(i, { amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textMuted} />
                    <TextInput style={[styles.input, styles.subCur, { color: theme.text, backgroundColor: theme.card }]} value={s.currency} onChangeText={(v) => setSub(i, { currency: v.toUpperCase().slice(0, 3) })} placeholder="JOD" placeholderTextColor={theme.textMuted} />
                    <Pressable onPress={() => removeSub(i)} style={styles.tierDel}><Ionicons name="close-circle" size={22} color={theme.textMuted} /></Pressable>
                  </View>
                ))}
                <Pressable onPress={addSub} style={[styles.addTier, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={Colors.primary} /><Text style={[styles.addTierText, { color: Colors.primary }]}>{t('discover.add_plan')}</Text></Pressable>

                <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1, marginTop: 20 }]}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('discover.save')}</Text>}
                </Pressable>

                {/* Team — owner only */}
                {sel?.isOwner && team && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={[styles.section, { color: theme.text }]}>{t('discover.team')}</Text>
                    {team.owner && (
                      <View style={styles.memberRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: theme.text }]}>{team.owner.name}</Text>
                          <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{team.owner.email}</Text>
                        </View>
                        <View style={[styles.roleChip, { backgroundColor: Colors.primary + '20' }]}><Text style={[styles.roleText, { color: Colors.primary }]}>{t('discover.role_owner')}</Text></View>
                      </View>
                    )}
                    {team.members.map((m) => (
                      <View key={m.id} style={styles.memberRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                          <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{m.email}</Text>
                        </View>
                        <Pressable onPress={() => removeManager(m.id!)} style={styles.removeBtn}><Ionicons name="trash-outline" size={16} color={Colors.accent} /></Pressable>
                      </View>
                    ))}
                    <View style={styles.addRow}>
                      <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card }]} value={newEmail} onChangeText={setNewEmail}
                        placeholder={t('discover.add_manager_email')} placeholderTextColor={theme.textMuted} autoCapitalize="none" keyboardType="email-address" />
                      <Pressable onPress={addManager} style={[styles.addBtn, { backgroundColor: Colors.primary }]}><Ionicons name="add" size={20} color="#fff" /></Pressable>
                    </View>
                    {!!teamErr && <Text style={[styles.errText, { color: Colors.accent }]}>{teamErr}</Text>}
                  </View>
                )}
              </KeyboardAwareScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, theme, multiline, keyboard }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.card }, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard || 'default'} placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

function ImageBox({ label, url, onPick, onClear, theme, square }: any) {
  return (
    <View style={square ? { width: 96 } : { flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <Pressable onPress={onPick} style={[styles.imageBox, square ? styles.imageSquare : styles.imageWide, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {url ? <Image source={{ uri: url }} style={StyleSheet.absoluteFill as any} resizeMode="cover" /> : <Ionicons name="cloud-upload-outline" size={22} color={theme.textMuted} />}
        {!!url && <Pressable onPress={onClear} style={styles.imageClear}><Ionicons name="close-circle" size={20} color="#fff" /></Pressable>}
      </Pressable>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  cardLogo: { width: 40, height: 40, borderRadius: 10 },
  name: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 11, fontFamily: 'Rubik_600SemiBold' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: 'Rubik_700Bold' },
  section: { fontSize: 14, fontFamily: 'Rubik_700Bold', marginTop: 18, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  imageBox: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageSquare: { width: 90, height: 90 },
  imageWide: { flex: 1, height: 90 },
  imageClear: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addBtn: { width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subAmount: { width: 74, textAlign: 'center' },
  subCur: { width: 60, textAlign: 'center' },
  tierDel: { padding: 2 },
  addTier: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  addTierText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  memberName: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  memberEmail: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  errText: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginTop: 6 },
});
