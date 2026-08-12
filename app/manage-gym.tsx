import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, Button, StatTile, SectionHeader, Chip, EmptyState } from '@/components/ui';
import { gymsApi, type ManagedGym, type TeamMember, type Facility } from '@/src/features/gyms/api';
import { uploadImageAsync } from '@/src/lib/upload';

// Branded gradient used as the photo-led fallback tile on each card (matches PhotoTile).
const TILE_GRADIENT = ['#1A3A30', '#0C201A'] as const;

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

  const owned = gyms.filter((g) => g.isOwner).length;
  const managing = gyms.length - owned;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Button variant="icon" icon="chevron-back" onPress={back} />
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('discover.manage_gym')}</Display>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {gyms.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <EmptyState icon="business-outline" title={t('discover.no_managed_gyms')} />
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.statsRow}>
              <StatTile icon="business-outline" value={gyms.length} label={t('discover.my_gyms')} />
              <StatTile icon="ribbon-outline" value={owned} label={t('discover.role_owner')} />
              <StatTile icon="shield-checkmark-outline" value={managing} label={t('discover.role_manager')} color={Colors.semantic.info} />
            </Animated.View>

            <SectionHeader title={t('discover.my_gyms')} style={{ marginTop: 4 }} />

            {gyms.map((g, i) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(120 + i * 70).duration(500)}>
                <Pressable onPress={() => open(g)} style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}>
                  {g.logoUrl ? (
                    <Image source={{ uri: g.logoUrl }} style={styles.cardLogo} />
                  ) : (
                    <LinearGradient colors={TILE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cardLogo, styles.cardLogoFallback]}>
                      <Ionicons name="business" size={20} color={Colors.electric} />
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{g.name}</Text>
                    <Text style={[styles.sub, { color: theme.textMuted }]} numberOfLines={1}>{g.city || g.address}</Text>
                  </View>
                  <Chip label={t(g.isOwner ? 'discover.role_owner' : 'discover.role_manager')} active={g.isOwner} />
                  <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                </Pressable>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Display variant="d3" color={theme.text} numberOfLines={1} style={{ flex: 1 }}>{sel?.name}</Display>
              <Pressable onPress={() => setSel(null)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            {draft && (
              <KeyboardAwareScrollView bottomOffset={20} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Media */}
                <SectionHeader title={t('discover.media')} style={styles.section} />
                <View style={styles.mediaRow}>
                  <ImageBox label={t('discover.logo')} url={draft.logoUrl} onPick={() => pickImage('logoUrl')} onClear={() => setDraft({ ...draft, logoUrl: null })} theme={theme} square />
                  <ImageBox label={t('discover.cover')} url={draft.coverUrl} onPick={() => pickImage('coverUrl')} onClear={() => setDraft({ ...draft, coverUrl: null })} theme={theme} />
                </View>

                {/* Basics */}
                <SectionHeader title={t('discover.basics')} style={styles.section} />
                <Field label={t('discover.gym_name')} value={draft.name} onChange={(v: string) => setDraft({ ...draft, name: v })} theme={theme} />
                <Field label={t('discover.description')} value={draft.description} onChange={(v: string) => setDraft({ ...draft, description: v })} theme={theme} multiline />

                {/* Contact */}
                <SectionHeader title={t('discover.contact')} style={styles.section} />
                <Field label={t('discover.phone')} value={draft.phone} onChange={(v: string) => setDraft({ ...draft, phone: v })} theme={theme} keyboard="phone-pad" />
                <Field label={t('discover.whatsapp')} value={draft.whatsapp} onChange={(v: string) => setDraft({ ...draft, whatsapp: v })} theme={theme} keyboard="phone-pad" />
                <Field label={t('discover.working_hours')} value={draft.workingHours} onChange={(v: string) => setDraft({ ...draft, workingHours: v })} theme={theme} />

                {/* Location */}
                <SectionHeader title={t('discover.location')} style={styles.section} />
                <Field label={t('discover.address')} value={draft.address} onChange={(v: string) => setDraft({ ...draft, address: v })} theme={theme} />
                <Field label={t('discover.city')} value={draft.city} onChange={(v: string) => setDraft({ ...draft, city: v })} theme={theme} />

                {/* Types */}
                <SectionHeader title={t('discover.gym_types')} style={styles.section} />
                <View style={styles.chipWrap}>
                  {draft.types.map((ty) => (
                    <Pressable key={ty} onPress={() => removeType(ty)} style={[styles.chip, { backgroundColor: Colors.electric + '20', borderColor: Colors.electric }]}>
                      <Text style={[styles.chipText, { color: Colors.electric }]}>{ty}</Text>
                      <Ionicons name="close" size={13} color={Colors.electric} />
                    </Pressable>
                  ))}
                </View>
                <View style={styles.addRow}>
                  <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]} value={typeInput} onChangeText={setTypeInput} onSubmitEditing={addType} placeholder={t('discover.add_type')} placeholderTextColor={theme.textMuted} />
                  <Pressable onPress={addType} style={[styles.addBtn, { backgroundColor: Colors.electric }]}><Ionicons name="add" size={20} color="#04120B" /></Pressable>
                </View>

                {/* Facilities */}
                {catalog.length > 0 && (
                  <>
                    <SectionHeader title={t('discover.facilities')} style={styles.section} />
                    <View style={styles.chipWrap}>
                      {catalog.map((f) => (
                        <Chip key={f.id} label={f.title} icon={(f.icon || 'ellipse-outline') as any} active={draft.facilityIds.includes(f.id)} onPress={() => toggleFacility(f.id)} />
                      ))}
                    </View>
                  </>
                )}

                {/* Subscriptions */}
                <SectionHeader title={t('discover.membership_plans')} style={styles.section} />
                {draft.subs.map((s, i) => (
                  <View key={i} style={styles.subRow}>
                    <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]} value={s.name} onChangeText={(v) => setSub(i, { name: v })} placeholder={t('discover.plan_name')} placeholderTextColor={theme.textMuted} />
                    <TextInput style={[styles.input, styles.subAmount, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]} value={s.amount} onChangeText={(v) => setSub(i, { amount: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.textMuted} />
                    <TextInput style={[styles.input, styles.subCur, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]} value={s.currency} onChangeText={(v) => setSub(i, { currency: v.toUpperCase().slice(0, 3) })} placeholder="JOD" placeholderTextColor={theme.textMuted} />
                    <Pressable onPress={() => removeSub(i)} style={styles.tierDel}><Ionicons name="close-circle" size={22} color={theme.textMuted} /></Pressable>
                  </View>
                ))}
                <Pressable onPress={addSub} style={[styles.addTier, { borderColor: theme.border }]}><Ionicons name="add" size={16} color={Colors.electric} /><Text style={[styles.addTierText, { color: Colors.electric }]}>{t('discover.add_plan')}</Text></Pressable>

                <Button variant="solid" label={t('discover.save')} onPress={save} disabled={saving} style={{ marginTop: 20, opacity: saving ? 0.7 : 1 }} />

                {/* Team — owner only */}
                {sel?.isOwner && team && (
                  <View style={{ marginTop: 24 }}>
                    <SectionHeader title={t('discover.team')} />
                    {team.owner && (
                      <View style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: theme.text }]}>{team.owner.name}</Text>
                          <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{team.owner.email}</Text>
                        </View>
                        <Chip label={t('discover.role_owner')} active />
                      </View>
                    )}
                    {team.members.map((m) => (
                      <View key={m.id} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                          <Text style={[styles.memberEmail, { color: theme.textMuted }]}>{m.email}</Text>
                        </View>
                        <Pressable onPress={() => removeManager(m.id!)} style={styles.removeBtn}><Ionicons name="trash-outline" size={16} color={Colors.semantic.danger} /></Pressable>
                      </View>
                    ))}
                    <View style={styles.addRow}>
                      <TextInput style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]} value={newEmail} onChangeText={setNewEmail}
                        placeholder={t('discover.add_manager_email')} placeholderTextColor={theme.textMuted} autoCapitalize="none" keyboardType="email-address" />
                      <Pressable onPress={addManager} style={[styles.addBtn, { backgroundColor: Colors.electric }]}><Ionicons name="add" size={20} color="#04120B" /></Pressable>
                    </View>
                    {!!teamErr && <Text style={[styles.errText, { color: Colors.semantic.danger }]}>{teamErr}</Text>}
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
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }, multiline && { height: 90, textAlignVertical: 'top' }]}
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
  headerTitle: { flex: 1, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 14, borderWidth: 1 },
  cardLogo: { width: 44, height: 44, borderRadius: 14 },
  cardLogoFallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontSize: 16, fontFamily: Fonts.semibold },
  sub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  section: { marginTop: 22 },
  fieldLabel: { fontSize: 12, fontFamily: Fonts.medium, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular, borderWidth: 1 },
  mediaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  imageBox: { borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageSquare: { width: 90, height: 90 },
  imageWide: { flex: 1, height: 90 },
  imageClear: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 34, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: Fonts.semibold },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addBtn: { width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  subAmount: { width: 74, textAlign: 'center' },
  subCur: { width: 60, textAlign: 'center' },
  tierDel: { padding: 2 },
  addTier: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginTop: 4 },
  addTierText: { fontSize: 13, fontFamily: Fonts.semibold },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  memberName: { fontSize: 14, fontFamily: Fonts.semibold },
  memberEmail: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
  removeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  errText: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 6 },
});
