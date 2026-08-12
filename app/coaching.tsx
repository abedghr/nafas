import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Button, Chip, EmptyState } from '@/components/ui';
import { coachPlansApi, coachesApi, coachTransformationsApi, type CoachPlan, type CoachLead, type Transformation } from '@/src/features/coaches/api';
import { classesApi, type ClassRequest } from '@/src/features/gyms/api';
import { Linking, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageAsync } from '@/src/lib/upload';

type Draft = { id?: string; name: string; includes: string; duration: string; amount: string; currency: string };
const empty: Draft = { name: '', includes: '', duration: '', amount: '', currency: 'JOD' };

export default function CoachingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [tab, setTab] = useState<'plans' | 'leads' | 'results' | 'classes'>('plans');
  const [plans, setPlans] = useState<CoachPlan[]>([]);
  const [leads, setLeads] = useState<CoachLead[]>([]);
  const [results, setResults] = useState<Transformation[]>([]);
  const [classReqs, setClassReqs] = useState<ClassRequest[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [trEditing, setTrEditing] = useState<Partial<Transformation> | null>(null);
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => coachPlansApi.mine().then(setPlans).catch(() => {});
  const loadLeads = () => coachesApi.myLeads().then(setLeads).catch(() => {});
  const loadResults = () => coachTransformationsApi.mine().then(setResults).catch(() => {});
  const loadClassReqs = () => classesApi.requests().then(setClassReqs).catch(() => {});
  useEffect(() => { load(); loadLeads(); loadResults(); loadClassReqs(); }, []);
  const setLeadStatus = async (id: string, status: string) => { await coachesApi.updateLead(id, status).catch(() => {}); loadLeads(); };
  const setClassReqStatus = async (id: string, status: string) => { await classesApi.updateRequest(id, status).catch(() => {}); loadClassReqs(); };
  const pendingClassReqs = classReqs.filter(r => r.status === 'pending').length;

  const pickImage = async (which: 'before' | 'after') => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(which);
    try { const url = await uploadImageAsync(res.assets[0].uri); setTrEditing(p => ({ ...p, [which === 'before' ? 'beforeImage' : 'afterImage']: url })); } catch {}
    setUploading(null);
  };
  const saveTr = async () => {
    if (!trEditing) return;
    const body = { beforeImage: trEditing.beforeImage ?? null, afterImage: trEditing.afterImage ?? null, duration: trEditing.duration ?? null, target: trEditing.target ?? null, clientName: trEditing.clientName ?? null };
    try {
      if (trEditing.id) await coachTransformationsApi.update(trEditing.id, body);
      else await coachTransformationsApi.create(body);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTrEditing(null); loadResults();
    } catch {}
  };
  const removeTr = async (id: string) => { await coachTransformationsApi.remove(id).catch(() => {}); loadResults(); };
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

  const openNew = () => setEditing({ ...empty });
  const openEdit = (p: CoachPlan) => setEditing({
    id: p.id, name: p.name, includes: (p.includes || []).join('\n'),
    duration: p.duration || '', amount: p.price ? String(p.price.amount) : '', currency: p.price?.currency || 'JOD',
  });

  const save = async () => {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    const body = {
      name: editing.name.trim(),
      includes: editing.includes.split('\n').map(s => s.trim()).filter(Boolean),
      duration: editing.duration.trim() || null,
      price: editing.amount ? { amount: Number(editing.amount), currency: (editing.currency || 'JOD').toUpperCase() } : null,
    };
    try {
      if (editing.id) await coachPlansApi.update(editing.id, body as any);
      else await coachPlansApi.create(body as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(null); await load();
    } catch {}
    setSaving(false);
  };
  const remove = async (id: string) => { await coachPlansApi.remove(id).catch(() => {}); load(); };

  const segLabel = (tb: 'plans' | 'leads' | 'results' | 'classes') =>
    `${t(tb === 'plans' ? 'discover.manage_plans' : tb === 'leads' ? 'discover.leads' : tb === 'results' ? 'discover.results' : 'discover.classes')}${tb === 'leads' && leads.length ? ` (${leads.length})` : ''}${tb === 'results' && results.length ? ` (${results.length})` : ''}${tb === 'classes' && pendingClassReqs ? ` (${pendingClassReqs})` : ''}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Button variant="icon" icon="chevron-back" onPress={back} />
        <Text style={[Type.h2, { color: theme.text, flex: 1, textAlign: 'center' }]}>{t('discover.my_coaching')}</Text>
        {tab === 'plans'
          ? <Pressable onPress={openNew} style={styles.addBtn}><Ionicons name="add" size={26} color={Colors.electric} /></Pressable>
          : tab === 'results'
          ? <Pressable onPress={() => setTrEditing({})} style={styles.addBtn}><Ionicons name="add" size={26} color={Colors.electric} /></Pressable>
          : <View style={styles.addBtn} />}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segment}>
        {(['plans', 'leads', 'results', 'classes'] as const).map(tb => (
          <Chip key={tb} label={segLabel(tb)} active={tab === tb} onPress={() => setTab(tb)} />
        ))}
      </ScrollView>

      {tab === 'leads' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {leads.length === 0 && <EmptyState icon="people-outline" title={t('discover.no_leads')} />}
          {leads.map((l, i) => (
            <Animated.View key={l.id} entering={FadeInDown.duration(400).delay(i * 60)}>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.h2, { color: theme.text }]}>{l.clientName}</Text>
                    {!!l.planName && <Text style={[styles.duration, { color: theme.textMuted }]}>{t('discover.interested_in')}: {l.planName}</Text>}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: l.status === 'contacted' ? Colors.electric + '20' : l.status === 'closed' ? theme.cardAlt : Colors.semantic.warn + '20' }]}>
                    <Text style={[styles.statusText, { color: l.status === 'contacted' ? Colors.electric : l.status === 'closed' ? theme.textMuted : Colors.semantic.warn }]}>{t(`discover.${l.status === 'pending' ? 'new_lead' : l.status}`)}</Text>
                  </View>
                </View>
                <View style={styles.leadActions}>
                  {!!l.clientPhone && <Pressable onPress={() => Linking.openURL(`tel:${l.clientPhone}`)} style={[styles.leadBtn, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /><Text style={[styles.leadBtnText, { color: theme.text }]}>{t('discover.call')}</Text></Pressable>}
                  {!!l.clientPhone && <Pressable onPress={() => Linking.openURL(`https://wa.me/${l.clientPhone!.replace(/[^0-9]/g, '')}`)} style={[styles.leadBtn, { borderColor: '#25D36680' }]}><Ionicons name="logo-whatsapp" size={14} color="#25D366" /><Text style={[styles.leadBtnText, { color: '#25D366' }]}>{t('discover.whatsapp')}</Text></Pressable>}
                  {l.status !== 'contacted' && <Pressable onPress={() => setLeadStatus(l.id, 'contacted')} style={[styles.leadBtn, { borderColor: Colors.electric }]}><Text style={[styles.leadBtnText, { color: Colors.electric }]}>{t('discover.mark_contacted')}</Text></Pressable>}
                  {l.status !== 'closed' && <Pressable onPress={() => setLeadStatus(l.id, 'closed')} style={[styles.leadBtn, { borderColor: theme.border }]}><Text style={[styles.leadBtnText, { color: theme.textMuted }]}>{t('discover.mark_closed')}</Text></Pressable>}
                </View>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      ) : tab === 'classes' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {classReqs.length === 0 && <EmptyState icon="calendar-outline" title={t('discover.no_class_requests')} />}
          {classReqs.map((r, i) => (
            <Animated.View key={r.id} entering={FadeInDown.duration(400).delay(i * 60)}>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.h2, { color: theme.text }]}>{r.userName}</Text>
                    {!!r.className && <Text style={[styles.duration, { color: theme.textMuted }]}>{r.className}</Text>}
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: r.status === 'enrolled' ? Colors.electric + '20' : r.status === 'rejected' ? theme.cardAlt : Colors.semantic.warn + '20' }]}>
                    <Text style={[styles.statusText, { color: r.status === 'enrolled' ? Colors.electric : r.status === 'rejected' ? theme.textMuted : Colors.semantic.warn }]}>{t(r.status === 'enrolled' ? 'discover.enrolled' : r.status === 'rejected' ? 'discover.rejected' : 'discover.pending_approval')}</Text>
                  </View>
                </View>
                {r.status === 'pending' && (
                  <View style={styles.leadActions}>
                    <Pressable onPress={() => setClassReqStatus(r.id, 'enrolled')} style={[styles.leadBtn, { borderColor: Colors.electric }]}><Ionicons name="checkmark" size={14} color={Colors.electric} /><Text style={[styles.leadBtnText, { color: Colors.electric }]}>{t('discover.approve')}</Text></Pressable>
                    <Pressable onPress={() => setClassReqStatus(r.id, 'rejected')} style={[styles.leadBtn, { borderColor: theme.border }]}><Ionicons name="close" size={14} color={theme.textMuted} /><Text style={[styles.leadBtnText, { color: theme.textMuted }]}>{t('discover.reject')}</Text></Pressable>
                    {!!r.userPhone && <Pressable onPress={() => Linking.openURL(`tel:${r.userPhone}`)} style={[styles.leadBtn, { borderColor: theme.border }]}><Ionicons name="call-outline" size={14} color={theme.text} /><Text style={[styles.leadBtnText, { color: theme.text }]}>{t('discover.call')}</Text></Pressable>}
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      ) : tab === 'results' ? (
        <ScrollView contentContainerStyle={styles.list}>
          {results.length === 0 && <EmptyState icon="images-outline" title={t('discover.no_results')} />}
          {results.map((tr, i) => (
            <Animated.View key={tr.id} entering={FadeInDown.duration(400).delay(i * 60)}>
              <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.baRow}>
                  <View style={styles.baCol}><Text style={[styles.baTag, { color: theme.textMuted }]}>{t('discover.before')}</Text>{tr.beforeImage ? <Image source={{ uri: tr.beforeImage }} style={styles.baImg} /> : <View style={[styles.baImg, { backgroundColor: theme.cardAlt }]} />}</View>
                  <Ionicons name="arrow-forward" size={22} color={Colors.electric} style={styles.baArrow} />
                  <View style={styles.baCol}><Text style={[styles.baTag, { color: theme.textMuted }]}>{t('discover.after')}</Text>{tr.afterImage ? <Image source={{ uri: tr.afterImage }} style={styles.baImg} /> : <View style={[styles.baImg, { backgroundColor: theme.cardAlt }]} />}</View>
                </View>
                {(!!tr.clientName || !!tr.target || !!tr.duration) && (
                  <View style={styles.baMeta}>
                    {!!tr.clientName && <Text style={[Type.h2, { color: theme.text }]}>{tr.clientName}</Text>}
                    <View style={styles.baMetaRow}>
                      {!!tr.target && <View style={[styles.baChip, { backgroundColor: Colors.electric + '20' }]}><Text style={[styles.incText, { color: Colors.electric }]}>{tr.target}</Text></View>}
                      {!!tr.duration && <View style={[styles.baChip, { backgroundColor: theme.cardAlt }]}><Text style={[styles.incText, { color: theme.textMuted }]}>{tr.duration}</Text></View>}
                    </View>
                  </View>
                )}
                <View style={styles.cardActions}>
                  <Pressable onPress={() => setTrEditing(tr)} style={styles.actionBtn}><Ionicons name="pencil" size={15} color={theme.textSecondary} /></Pressable>
                  <Pressable onPress={() => removeTr(tr.id)} style={styles.actionBtn}><Ionicons name="trash-outline" size={15} color={Colors.semantic.danger} /></Pressable>
                </View>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={styles.list}>
        {plans.length === 0 && <EmptyState icon="clipboard-outline" title={t('discover.no_plans')} />}
        {plans.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.duration(400).delay(i * 60)}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[Type.h2, { color: theme.text }]}>{p.name}</Text>
                  {!!p.duration && <Text style={[styles.duration, { color: theme.textMuted }]}>{p.duration}</Text>}
                </View>
                {p.price && <Text style={styles.price}>{p.price.amount} {p.price.currency}</Text>}
              </View>
              {p.includes.length > 0 && (
                <View style={styles.includes}>
                  {p.includes.map((inc, idx) => (
                    <View key={idx} style={styles.incRow}><Ionicons name="checkmark-circle" size={14} color={Colors.electric} /><Text style={[styles.incText, { color: theme.textSecondary }]}>{inc}</Text></View>
                  ))}
                </View>
              )}
              <View style={styles.cardActions}>
                <Pressable onPress={() => openEdit(p)} style={styles.actionBtn}><Ionicons name="pencil" size={15} color={theme.textSecondary} /></Pressable>
                <Pressable onPress={() => remove(p.id)} style={styles.actionBtn}><Ionicons name="trash-outline" size={15} color={Colors.semantic.danger} /></Pressable>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
      )}

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[Type.h1, { color: theme.text }]}>{editing?.id ? t('discover.edit_plan') : t('discover.add_plan')}</Text>
              <Pressable onPress={() => setEditing(null)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            {editing && (
              <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                <Field label={t('discover.plan_name')} value={editing.name} onChange={(v: string) => setEditing({ ...editing, name: v })} theme={theme} />
                <Field label={t('discover.plan_duration')} value={editing.duration} onChange={(v: string) => setEditing({ ...editing, duration: v })} theme={theme} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Field label={t('discover.plan_amount')} value={editing.amount} onChange={(v: string) => setEditing({ ...editing, amount: v.replace(/[^0-9.]/g, '') })} theme={theme} keyboard="decimal-pad" /></View>
                  <View style={{ width: 90 }}><Field label={t('discover.plan_currency')} value={editing.currency} onChange={(v: string) => setEditing({ ...editing, currency: v })} theme={theme} /></View>
                </View>
                <Field label={t('discover.plan_includes')} value={editing.includes} onChange={(v: string) => setEditing({ ...editing, includes: v })} theme={theme} multiline />
                <Button variant="solid" label={t('discover.save')} onPress={save} disabled={saving} style={{ marginTop: 8 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!trEditing} transparent animationType="slide" onRequestClose={() => setTrEditing(null)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[Type.h1, { color: theme.text }]}>{trEditing?.id ? t('discover.edit_result') : t('discover.add_result')}</Text>
              <Pressable onPress={() => setTrEditing(null)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            {trEditing && (
              <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
                <View style={styles.baRow}>
                  {(['before', 'after'] as const).map(w => {
                    const img = w === 'before' ? trEditing.beforeImage : trEditing.afterImage;
                    return (
                      <Pressable key={w} onPress={() => pickImage(w)} style={styles.baCol} disabled={uploading === w}>
                        <Text style={[styles.baTag, { color: theme.textMuted }]}>{t(`discover.${w}`)}</Text>
                        {img
                          ? <Image source={{ uri: img }} style={styles.baImg} />
                          : <View style={[styles.baImg, styles.baUpload, { backgroundColor: theme.card, borderColor: theme.border }]}><Ionicons name={uploading === w ? 'cloud-upload-outline' : 'add'} size={26} color={theme.textMuted} /></View>}
                      </Pressable>
                    );
                  })}
                </View>
                <Field label={t('discover.client_name')} value={trEditing.clientName || ''} onChange={(v: string) => setTrEditing({ ...trEditing, clientName: v })} theme={theme} />
                <Field label={t('discover.target')} value={trEditing.target || ''} onChange={(v: string) => setTrEditing({ ...trEditing, target: v })} theme={theme} />
                <Field label={t('discover.plan_duration')} value={trEditing.duration || ''} onChange={(v: string) => setTrEditing({ ...trEditing, duration: v })} theme={theme} />
                <Button variant="solid" label={t('discover.save')} onPress={saveTr} style={{ marginTop: 8 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, theme, multiline, keyboard }: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }, multiline && { height: 100, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} multiline={multiline} keyboardType={keyboard || 'default'}
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 4 },
  addBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  segment: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: Fonts.semibold },
  leadActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  leadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  leadBtnText: { fontSize: 12, fontFamily: Fonts.semibold },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 18, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  duration: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  price: { fontSize: 17, fontFamily: Fonts.monoBold, color: Colors.electric },
  includes: { gap: 8, marginTop: 12 },
  incRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  incText: { fontSize: 13, fontFamily: Fonts.regular },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 12 },
  actionBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontFamily: Fonts.medium, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular, borderWidth: 1 },
  baRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  baCol: { flex: 1, gap: 6 },
  baTag: { fontSize: 11, fontFamily: Fonts.semibold, textAlign: 'center' },
  baImg: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14 },
  baUpload: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  baArrow: { marginTop: 18 },
  baMeta: { marginTop: 12, gap: 8 },
  baMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  baChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
