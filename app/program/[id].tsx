import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp, type Program, type ProgramDay } from '@/lib/app-context';
import Colors from '@/constants/colors';

const DAY_KEYS = ['weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat', 'weekdaySun'] as const;

export default function ProgramBuilderScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programs, updateProgram, workoutTemplates, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const program = programs.find(p => p.id === id);

  // name/notes are typed locally, committed on blur (avoids an update per keystroke)
  const [name, setName] = useState(program?.name ?? '');
  const [notes, setNotes] = useState(program?.notes ?? '');
  useEffect(() => {
    if (program) { setName(program.name); setNotes(program.notes ?? ''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // day editor sheet state
  const [editing, setEditing] = useState<{ week: number; day: number } | null>(null);
  const [dRest, setDRest] = useState(false);
  const [dTemplateId, setDTemplateId] = useState<string | null>(null);
  const [dLabel, setDLabel] = useState('');
  const [dNotes, setDNotes] = useState('');
  const [search, setSearch] = useState('');

  const commit = useCallback((patch: Partial<Omit<Program, 'id' | 'userId'>>) => {
    if (!program) return;
    updateProgram(program.id, {
      name: program.name,
      startDate: program.startDate ?? null,
      weeks: program.weeks,
      notes: program.notes ?? '',
      days: program.days ?? [],
      ...patch,
    });
  }, [program, updateProgram]);

  // upsert a day by (weekIndex, dayIndex) into the days array
  const upsertDay = useCallback((day: ProgramDay) => {
    if (!program) return;
    const rest = (program.days ?? []).filter(d => !(d.weekIndex === day.weekIndex && d.dayIndex === day.dayIndex));
    commit({ days: [...rest, day] });
  }, [program, commit]);

  const removeDay = useCallback((week: number, dayIdx: number) => {
    if (!program) return;
    commit({ days: (program.days ?? []).filter(d => !(d.weekIndex === week && d.dayIndex === dayIdx)) });
  }, [program, commit]);

  const findDay = useCallback((week: number, dayIdx: number) =>
    (program?.days ?? []).find(d => d.weekIndex === week && d.dayIndex === dayIdx),
  [program]);

  const templateName = useCallback((templateId?: string | null) =>
    templateId ? workoutTemplates.find(tp => tp.id === templateId)?.name : undefined,
  [workoutTemplates]);

  const openDay = (week: number, dayIdx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const day = findDay(week, dayIdx);
    setDRest(day?.restDay ?? false);
    setDTemplateId(day?.templateId ?? null);
    setDLabel(day?.label ?? '');
    setDNotes(day?.notes ?? '');
    setSearch('');
    setEditing({ week, day: dayIdx });
  };

  const saveDay = () => {
    if (!editing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    upsertDay({
      weekIndex: editing.week,
      dayIndex: editing.day,
      restDay: dRest,
      templateId: dRest ? null : dTemplateId,
      label: dLabel.trim(),
      notes: dNotes.trim(),
    });
    setEditing(null);
  };

  const clearDay = () => {
    if (!editing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeDay(editing.week, editing.day);
    setEditing(null);
  };

  const setWeeks = (delta: number) => {
    if (!program) return;
    const next = Math.min(52, Math.max(1, program.weeks + delta));
    if (next === program.weeks) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    commit({ weeks: next });
  };

  const startDay = (day: ProgramDay) => {
    if (!day.templateId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(('/prepare-workout?templateId=' + day.templateId + '&run=1') as any);
  };

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return workoutTemplates;
    const q = search.toLowerCase();
    return workoutTemplates.filter(tp =>
      tp.name.toLowerCase().includes(q) || (tp.workoutType || '').toLowerCase().includes(q));
  }, [workoutTemplates, search]);

  if (!program) {
    return (
      <View style={[s.container, { backgroundColor: theme.background, paddingTop: topPad + 20 }]}>
        <View style={s.notFound}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[s.notFoundText, { color: theme.textSecondary }]}>{t('programs.notFound')}</Text>
          <Pressable onPress={() => router.back()} style={s.goBackBtn}>
            <Text style={s.goBackText}>{t('programs.goBack')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>{program.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* program meta */}
        <View style={[s.metaCard, { backgroundColor: theme.card }]}>
          <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('programs.programName')}</Text>
          <TextInput
            style={[s.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            value={name}
            onChangeText={setName}
            onBlur={() => commit({ name: name.trim() || program.name })}
            placeholder={t('programs.newProgram')}
            placeholderTextColor={theme.textMuted}
          />

          <View style={s.weeksRow}>
            <Text style={[s.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>{t('programs.weeks')}</Text>
            <View style={s.stepper}>
              <Pressable
                onPress={() => setWeeks(-1)}
                disabled={program.weeks <= 1}
                hitSlop={8}
                style={[s.stepBtn, { borderColor: theme.border, opacity: program.weeks <= 1 ? 0.4 : 1 }]}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </Pressable>
              <Text style={[s.stepVal, { color: theme.text }]}>{program.weeks}</Text>
              <Pressable
                onPress={() => setWeeks(1)}
                disabled={program.weeks >= 52}
                hitSlop={8}
                style={[s.stepBtn, { borderColor: theme.border, opacity: program.weeks >= 52 ? 0.4 : 1 }]}
              >
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('programs.notesOptional')}</Text>
          <TextInput
            style={[s.fieldInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, height: 64, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            onBlur={() => commit({ notes: notes.trim() })}
            placeholder={t('programs.programNotesPlaceholder')}
            placeholderTextColor={theme.textMuted}
            multiline
          />
        </View>

        {/* weeks grid */}
        {Array.from({ length: program.weeks }, (_, w) => (
          <View key={w} style={[s.weekCard, { backgroundColor: theme.card }]}>
            <Text style={[s.weekTitle, { color: Colors.primary }]}>{t('programs.weekN', { n: w + 1 })}</Text>
            {DAY_KEYS.map((dk, dIdx) => {
              const day = findDay(w, dIdx);
              const tmplName = templateName(day?.templateId);
              const planned = !!day && !day.restDay && !!day.templateId;
              let stateText: string;
              let stateColor = theme.textMuted;
              if (day?.restDay) {
                stateText = t('programs.restDay');
                stateColor = theme.textSecondary;
              } else if (tmplName) {
                stateText = tmplName;
                stateColor = theme.text;
              } else if (day?.label) {
                stateText = day.label;
                stateColor = theme.text;
              } else {
                stateText = '—';
              }
              return (
                <Pressable
                  key={dk}
                  onPress={() => openDay(w, dIdx)}
                  style={({ pressed }) => [
                    s.dayRow,
                    dIdx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[s.dayName, { color: theme.textMuted }]} numberOfLines={1}>
                    {t(`workoutTab.${dk}`)}
                  </Text>
                  {day?.restDay ? (
                    <View style={[s.restChip, { backgroundColor: theme.surface }]}>
                      <Ionicons name="moon-outline" size={12} color={theme.textSecondary} />
                      <Text style={[s.restChipText, { color: theme.textSecondary }]}>{stateText}</Text>
                    </View>
                  ) : (
                    <Text style={[s.dayState, { color: stateColor }]} numberOfLines={1}>{stateText}</Text>
                  )}
                  {planned && (
                    <Pressable
                      onPress={() => startDay(day!)}
                      hitSlop={8}
                      style={({ pressed }) => [s.startBtn, { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Ionicons name="play" size={11} color="#fff" />
                      <Text style={s.startBtnText}>{t('programs.startDay')}</Text>
                    </Pressable>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={theme.textMuted} />
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* day editor bottom sheet */}
      <Modal visible={editing !== null} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={s.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setEditing(null)} />
          <View style={[s.sheet, { backgroundColor: theme.background }]}>
            <View style={s.sheetHandleWrap}>
              <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />
            </View>
            <View style={s.sheetHeader}>
              <Text style={[s.sheetTitle, { color: theme.text }]}>
                {editing
                  ? `${t('programs.weekN', { n: editing.week + 1 })} · ${t(`workoutTab.${DAY_KEYS[editing.day]}`)}`
                  : t('programs.planDay')}
              </Text>
              <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            {/* rest toggle */}
            <View style={[s.restRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Ionicons name="moon-outline" size={18} color={Colors.accent} />
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{t('programs.restDayToggle')}</Text>
              </View>
              <Switch
                value={dRest}
                onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDRest(v); }}
                trackColor={{ false: theme.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {!dRest && (
              <>
                <View style={s.inputsRow}>
                  <View style={{ flex: 1, minWidth: 130 }}>
                    <Text style={[s.miniLabel, { color: theme.textMuted }]}>{t('programs.labelOptional')}</Text>
                    <TextInput
                      style={[s.sheetInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                      value={dLabel}
                      onChangeText={setDLabel}
                      placeholder={t('programs.labelPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 130 }}>
                    <Text style={[s.miniLabel, { color: theme.textMuted }]}>{t('programs.notesOptional')}</Text>
                    <TextInput
                      style={[s.sheetInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                      value={dNotes}
                      onChangeText={setDNotes}
                      placeholder={t('programs.dayNotesPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                </View>

                <Text style={[s.miniLabel, { color: theme.textMuted, marginTop: 12 }]}>{t('programs.pickWorkout')}</Text>
                <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="search" size={16} color={theme.textMuted} />
                  <TextInput
                    style={[s.searchInput, { color: theme.text }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null]}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t('programs.searchWorkouts')}
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')}>
                      <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                    </Pressable>
                  )}
                </View>

                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {filteredTemplates.length === 0 && (
                    <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 20, fontSize: 13 }}>
                      {workoutTemplates.length === 0 ? t('programs.noTemplates') : t('programs.noMatchingTemplates')}
                    </Text>
                  )}
                  {filteredTemplates.map(tmpl => {
                    const active = dTemplateId === tmpl.id;
                    return (
                      <Pressable
                        key={tmpl.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDTemplateId(active ? null : tmpl.id);
                        }}
                        style={[s.tmplRow, { borderBottomColor: theme.border }]}
                      >
                        <View style={[s.tmplIcon, { backgroundColor: (active ? Colors.primary : theme.textMuted) + '15' }]}>
                          <Ionicons name="barbell-outline" size={16} color={active ? Colors.primary : theme.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: active ? Colors.primary : theme.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                            {tmpl.name}
                          </Text>
                          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                            {t('programs.exercisesCount', { n: tmpl.exercises.length })}
                            {tmpl.workoutType ? ` · ${t(`workoutTypeNames.${tmpl.workoutType}`, { defaultValue: tmpl.workoutType })}` : ''}
                          </Text>
                        </View>
                        {active && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
            {dRest && <View style={{ flex: 1 }} />}

            <View style={[s.sheetFooter, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom + 12 }]}>
              <Pressable
                onPress={clearDay}
                style={({ pressed }) => [s.clearBtn, { borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name="trash-outline" size={16} color="#F87171" />
                <Text style={s.clearBtnText}>{t('programs.clearDay')}</Text>
              </Pressable>
              <Pressable onPress={saveDay} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.saveBtn}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.saveBtnText}>{t('programs.save')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  notFoundText: { fontSize: 16, fontWeight: '600' },
  goBackBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  goBackText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metaCard: { borderRadius: 16, padding: 14, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  weeksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  weekCard: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  weekTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11 },
  dayName: { fontSize: 12, fontWeight: '600', minWidth: 44, maxWidth: 70 },
  dayState: { flex: 1, fontSize: 13, fontWeight: '500' },
  restChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  restChipText: { fontSize: 12, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  startBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8 },
  restRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12, gap: 8,
  },
  inputsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  sheetInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  tmplRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tmplIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  clearBtnText: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: 14, paddingVertical: 13,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
