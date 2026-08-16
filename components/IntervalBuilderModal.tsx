import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import Colors from '@/constants/colors';
import type { IntervalBlock, TemplateExercise } from '@/lib/app-context';

type Measure = 'time' | 'distance';
type RecoveryKind = 'passive' | 'active';

// Parse "mm:ss" or a plain seconds string into total seconds.
export function parseDuration(text: string): number {
  const t = (text || '').trim();
  if (!t) return 0;
  if (t.includes(':')) {
    const [m, sec] = t.split(':');
    return (parseInt(m) || 0) * 60 + (parseInt(sec) || 0);
  }
  return parseInt(t) || 0;
}

// Format seconds back into "m:ss" (>= 60s) or "Ns".
export function formatDuration(sec: number): string {
  if (!sec) return '0s';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Author an interval / cardio block (running, HIIT): a WORK bout (time or
// distance, optional pace), an optional RECOVERY bout (passive/active), and a
// round count. Returns a TemplateExercise-shaped block with kind:'intervals'.
export default function IntervalBuilderModal({ visible, onClose, onCreate, theme }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (block: TemplateExercise) => void;
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [workMeasure, setWorkMeasure] = useState<Measure>('time');
  const [workDuration, setWorkDuration] = useState('3:00');
  const [workMeters, setWorkMeters] = useState('');
  const [pace, setPace] = useState('');

  const [recoveryOn, setRecoveryOn] = useState(true);
  const [recMeasure, setRecMeasure] = useState<Measure>('time');
  const [recDuration, setRecDuration] = useState('1:30');
  const [recMeters, setRecMeters] = useState('');
  const [recKind, setRecKind] = useState<RecoveryKind>('active');

  const [rounds, setRounds] = useState(4);

  const reset = () => {
    setName(''); setWorkMeasure('time'); setWorkDuration('3:00'); setWorkMeters(''); setPace('');
    setRecoveryOn(true); setRecMeasure('time'); setRecDuration('1:30'); setRecMeters(''); setRecKind('active');
    setRounds(4);
  };
  const close = () => { reset(); onClose(); };

  const workValue = workMeasure === 'time' ? parseDuration(workDuration) : (parseInt(workMeters) || 0);
  const canSave = workValue > 0;

  const create = () => {
    if (!canSave) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const work: IntervalBlock['work'] = workMeasure === 'time'
      ? { measure: 'time', durationSeconds: parseDuration(workDuration) }
      : { measure: 'distance', distanceMeters: parseInt(workMeters) || 0 };
    if (pace.trim()) work.pace = pace.trim();

    let recovery: IntervalBlock['recovery'] | undefined;
    if (recoveryOn) {
      recovery = recMeasure === 'time'
        ? { measure: 'time', durationSeconds: parseDuration(recDuration), kind: recKind }
        : { measure: 'distance', distanceMeters: parseInt(recMeters) || 0, kind: recKind };
    }

    const block: TemplateExercise = {
      exerciseId: Crypto.randomUUID(),
      name: name.trim() || t('intervalBuilder.defaultName', { defaultValue: 'Intervals' }),
      muscleGroup: 'Cardio',
      restSeconds: 0,
      sets: [],
      kind: 'intervals',
      intervals: { work, recovery, rounds: Math.max(1, rounds) },
    };
    onCreate(block);
    close();
  };

  const MeasureToggle = ({ value, onChange }: { value: Measure; onChange: (m: Measure) => void }) => (
    <View style={s.segRow}>
      {(['time', 'distance'] as const).map(m => (
        <Pressable
          key={m}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(m); }}
          style={[s.seg, { borderColor: value === m ? Colors.electric : theme.border, backgroundColor: value === m ? Colors.electric + '18' : 'transparent' }]}
        >
          <Text style={[s.segText, { color: value === m ? Colors.electric : theme.textMuted }]}>
            {m === 'time' ? t('intervalBuilder.time', { defaultValue: 'Time' }) : t('intervalBuilder.distance', { defaultValue: 'Distance' })}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('intervalBuilder.title', { defaultValue: 'Interval Block' })}</Text>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Block name */}
            <Text style={[s.fieldLabel, { color: theme.textMuted }]}>{t('intervalBuilder.blockName', { defaultValue: 'Block name' })}</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder={t('intervalBuilder.defaultName', { defaultValue: 'Intervals' })}
              placeholderTextColor={theme.textMuted}
            />

            {/* WORK */}
            <View style={[s.section, { borderColor: theme.border }]}>
              <Text style={[s.sectionTitle, { color: Colors.electric }]}>{t('intervalBuilder.work', { defaultValue: 'Work' })}</Text>
              <MeasureToggle value={workMeasure} onChange={setWorkMeasure} />
              {workMeasure === 'time' ? (
                <View style={s.inlineFieldRow}>
                  <TextInput
                    style={[s.valueInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={workDuration}
                    onChangeText={setWorkDuration}
                    placeholder="3:00"
                    placeholderTextColor={theme.textMuted}
                    selectTextOnFocus
                  />
                  <Text style={[s.hint, { color: theme.textMuted }]}>{t('intervalBuilder.mmssHint', { defaultValue: 'mm:ss or seconds' })}</Text>
                </View>
              ) : (
                <View style={s.inlineFieldRow}>
                  <TextInput
                    style={[s.valueInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                    value={workMeters}
                    onChangeText={setWorkMeters}
                    keyboardType="numeric"
                    placeholder="400"
                    placeholderTextColor={theme.textMuted}
                    selectTextOnFocus
                  />
                  <Text style={[s.hint, { color: theme.textMuted }]}>{t('intervalBuilder.meters', { defaultValue: 'meters' })}</Text>
                </View>
              )}
              <Text style={[s.fieldLabel, { color: theme.textMuted, marginTop: 10 }]}>{t('intervalBuilder.paceOptional', { defaultValue: 'Target pace (optional)' })}</Text>
              <TextInput
                style={[s.textInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={pace}
                onChangeText={setPace}
                placeholder="4:30/km"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* RECOVERY */}
            <View style={[s.section, { borderColor: theme.border }]}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRecoveryOn(v => !v); }} style={s.sectionHeadRow}>
                <Text style={[s.sectionTitle, { color: theme.text }]}>{t('intervalBuilder.recovery', { defaultValue: 'Recovery' })}</Text>
                <View style={[s.toggle, { backgroundColor: recoveryOn ? Colors.electric : theme.border }]}>
                  <View style={[s.toggleDot, { alignSelf: recoveryOn ? 'flex-end' : 'flex-start' }]} />
                </View>
              </Pressable>
              {recoveryOn && (
                <>
                  <MeasureToggle value={recMeasure} onChange={setRecMeasure} />
                  {recMeasure === 'time' ? (
                    <View style={s.inlineFieldRow}>
                      <TextInput
                        style={[s.valueInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        value={recDuration}
                        onChangeText={setRecDuration}
                        placeholder="1:30"
                        placeholderTextColor={theme.textMuted}
                        selectTextOnFocus
                      />
                      <Text style={[s.hint, { color: theme.textMuted }]}>{t('intervalBuilder.mmssHint', { defaultValue: 'mm:ss or seconds' })}</Text>
                    </View>
                  ) : (
                    <View style={s.inlineFieldRow}>
                      <TextInput
                        style={[s.valueInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                        value={recMeters}
                        onChangeText={setRecMeters}
                        keyboardType="numeric"
                        placeholder="200"
                        placeholderTextColor={theme.textMuted}
                        selectTextOnFocus
                      />
                      <Text style={[s.hint, { color: theme.textMuted }]}>{t('intervalBuilder.meters', { defaultValue: 'meters' })}</Text>
                    </View>
                  )}
                  <View style={[s.segRow, { marginTop: 10 }]}>
                    {(['passive', 'active'] as const).map(k => (
                      <Pressable
                        key={k}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRecKind(k); }}
                        style={[s.seg, { borderColor: recKind === k ? Colors.electric : theme.border, backgroundColor: recKind === k ? Colors.electric + '18' : 'transparent' }]}
                      >
                        <Text style={[s.segText, { color: recKind === k ? Colors.electric : theme.textMuted }]}>
                          {k === 'passive' ? t('intervalBuilder.passive', { defaultValue: 'Passive' }) : t('intervalBuilder.active', { defaultValue: 'Active' })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ROUNDS */}
            <View style={s.roundsRow}>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('intervalBuilder.rounds', { defaultValue: 'Rounds' })}</Text>
              <View style={s.stepper}>
                <Pressable onPress={() => setRounds(r => Math.max(1, r - 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="remove" size={18} color={theme.text} /></Pressable>
                <Text style={[s.stepVal, { color: theme.text }]}>{rounds}</Text>
                <Pressable onPress={() => setRounds(r => Math.min(50, r + 1))} hitSlop={8} style={[s.stepBtn, { borderColor: theme.border }]}><Ionicons name="add" size={18} color={theme.text} /></Pressable>
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={create} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.4, marginTop: 8, marginBottom: 24 }}>
            <LinearGradient colors={[Colors.electric, Colors.electricPressed]} style={s.createBtn}>
              <Text style={s.createText}>{t('intervalBuilder.save', { defaultValue: 'Add interval block' })}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: 16 },
  modalHandle: { alignItems: 'center', paddingVertical: 10 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  textInput: { height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  section: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14, gap: 4 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  inlineFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  valueInput: { width: 90, height: 44, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, fontWeight: '500' },
  toggle: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  toggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  roundsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  createBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  createText: { color: '#04120B', fontSize: 15, fontWeight: '700' },
});
