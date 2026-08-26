import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { alertDialog, confirmDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { componentToSetConfig } from '@/components/ComboBuilderModal';
import WorkoutTextModal from '@/components/WorkoutTextModal';
import WorkoutBuilder, { type PrepExercise } from '@/components/WorkoutBuilder';
import { resolveDayExercises } from '@/lib/program-schedule';
import { Display, Button as UIButton } from '@/components/ui';
import type { WorkoutType, WorkoutTemplate } from '@/lib/app-context';
import { templateSig } from '@/lib/app-context';


const WORKOUT_TYPE_ICONS: Record<string, string> = {
  'Push Day': 'arrow-up-circle-outline',
  'Pull Day': 'arrow-down-circle-outline',
  'Leg Day': 'walk-outline',
  'Upper Body': 'body-outline',
  'Lower Body': 'footsteps-outline',
  'Full Body': 'fitness-outline',
  'Cardio': 'heart-outline',
  'HIIT': 'flash-outline',
  'Strength': 'barbell-outline',
  'Mobility': 'accessibility-outline',
  'Custom': 'create-outline',
};

function TemplatePickerModal({ visible, onClose, onSelect, onEdit, onDelete, templates, theme }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: WorkoutTemplate) => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
  templates: WorkoutTemplate[];
  theme: typeof Colors.dark;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const confirmDelete = async (tmpl: WorkoutTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (await confirmDialog({
      title: t('workoutPrep.deleteSavedWorkout', { defaultValue: 'Delete saved workout' }),
      message: t('workoutPrep.deleteSavedWorkoutConfirm', { name: tmpl.name, defaultValue: `Delete "${tmpl.name}"? This can't be undone.` }),
      destructive: true,
      confirmText: t('workoutSession.delete', { defaultValue: 'Delete' }),
      cancelText: t('workoutSession.cancel', { defaultValue: 'Cancel' }),
    })) {
      onDelete(tmpl);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(t => t.name.toLowerCase().includes(q) || (t.workoutType || '').toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end', flex: 1 }}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}>
            <View style={[s.handleBar, { backgroundColor: theme.border }]} />
          </View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutPrep.loadSavedWorkout')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[s.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <TextInput
              style={[s.searchInput, { color: theme.text }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('workoutPrep.searchSavedWorkouts')}
              placeholderTextColor={theme.textMuted}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 8 }}>
                <Ionicons name="bookmark-outline" size={40} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, fontSize: 15 }}>
                  {templates.length === 0 ? t('workoutPrep.noSavedWorkouts') : t('workoutPrep.noMatchingWorkouts')}
                </Text>
              </View>
            ) : (
              filtered.map((tmpl, i) => {
                const totalSets = tmpl.exercises.reduce((a, e) => a + e.sets.length, 0);
                const muscles = [...new Set(tmpl.exercises.map(e => e.muscleGroup))].slice(0, 3);
                return (
                  <View key={tmpl.id} style={s.templatePickerRow}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSelect(tmpl);
                        onClose();
                      }}
                      style={({ pressed }) => [
                        s.templatePickerItem,
                        { flex: 1, backgroundColor: pressed ? theme.card : 'transparent' },
                      ]}
                    >
                      <View style={[s.templatePickerIcon, { backgroundColor: Colors.primary + '15' }]}>
                        <Ionicons name={(WORKOUT_TYPE_ICONS[tmpl.workoutType || ''] || 'barbell-outline') as any} size={20} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.templatePickerName, { color: theme.text }]}>{tmpl.name}</Text>
                        <Text style={[s.templatePickerMeta, { color: theme.textMuted }]}>
                          {t('workoutPrep.templateMeta', { exercises: tmpl.exercises.length, sets: totalSets })}{tmpl.workoutType ? ` · ${tmpl.workoutType}` : ''}
                        </Text>
                        {muscles.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                            {muscles.map(m => (
                              <View key={m} style={[s.miniMuscleTag, { backgroundColor: Colors.primary + '12' }]}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: Colors.primary }}>{m}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </Pressable>
                    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onEdit(tmpl); onClose(); }} hitSlop={10} style={s.templateDeleteBtn}>
                      <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(tmpl)} hitSlop={10} style={s.templateDeleteBtn}>
                      <Ionicons name="trash-outline" size={18} color="#F87171" />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function PrepareWorkoutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { templateId, run, programId, weekIndex, dayIndex, enrollmentId, slotDay, subEnroll, subWeek, subDay } = useLocalSearchParams<{ templateId?: string; run?: string; programId?: string; weekIndex?: string; dayIndex?: string; enrollmentId?: string; slotDay?: string; subEnroll?: string; subWeek?: string; subDay?: string }>();
  const inProgram = !!programId;
  const isRunning = !!run; // running a program day (start live) vs authoring a program day (save only)
  const {
    workoutTemplates, addWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate, setActiveSession,
    user, programs, updateProgram, activeEnrollment, isDark,
  } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  // header/footer fades derived from the theme background (were hardcoded dark navy → a
  // black smear over the buttons in light mode)
  const fadeRGB = isDark ? '7,7,11' : '245,245,250';
  const fadeSolid = `rgba(${fadeRGB},1)`, fadeMid = `rgba(${fadeRGB},0.95)`, fadeSoft = `rgba(${fadeRGB},0.7)`;
  const [editingId, setEditingId] = useState<string | null>(null);

  const [workoutName, setWorkoutName] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
  const [exercises, setExercises] = useState<PrepExercise[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (templateId) {
      const tmpl = workoutTemplates.find(t => t.id === templateId);
      if (tmpl) {
        setWorkoutName(tmpl.name);
        setWorkoutType(tmpl.workoutType || null);
        setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() })));
        if (!run) setEditingId(tmpl.id); // deep-linked = edit; run=1 = load to run (e.g. from a program)
      }
    }
  }, [templateId, run]);

  // program mode: load the day's inline workout (or its template) into the builder
  useEffect(() => {
    if (!programId) return;
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;
    const day = (prog.days ?? []).find(d => d.weekIndex === Number(weekIndex) && d.dayIndex === Number(dayIndex));
    if (day?.exercises?.length) {
      setWorkoutName(day.name || prog.name);
      // apply this enrollment's flagged day edits (added/removed) on top of the template
      const enr = activeEnrollment && activeEnrollment.programId === programId ? activeEnrollment : null;
      const resolved = resolveDayExercises(enr, Number(weekIndex), Number(dayIndex), day.exercises as any[]);
      setExercises(resolved.map((e: any) => ({ ...e, uid: Crypto.randomUUID() })));
    } else if (day?.templateId) {
      const tmpl = workoutTemplates.find(t => t.id === day.templateId);
      if (tmpl) { setWorkoutName(tmpl.name); setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() }))); }
    }
    // no editingId in program mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // load a template to RUN/tweak (not bound to editing the saved copy)
  const handleLoadTemplate = useCallback((tmpl: WorkoutTemplate) => {
    setWorkoutName(tmpl.name);
    setWorkoutType(tmpl.workoutType || null);
    setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() })));
    setEditingId(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // load a template to EDIT in place (Save updates the same template)
  const handleEditTemplate = useCallback((tmpl: WorkoutTemplate) => {
    setWorkoutName(tmpl.name);
    setWorkoutType(tmpl.workoutType || null);
    setExercises(tmpl.exercises.map(e => ({ ...e, uid: Crypto.randomUUID() })));
    setEditingId(tmpl.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const resolvedName = useMemo(() => {
    if (workoutType && workoutType !== 'Custom') return workoutType;
    return workoutName.trim() || '';
  }, [workoutType, workoutName]);

  // content signature → dedup: a template with the same name+exercises is "already saved".
  // shared templateSig so this agrees with the summary screen + app-context dedup.
  const currentSig = useMemo(() => templateSig(resolvedName, exercises), [resolvedName, exercises]);
  const alreadySaved = useMemo(
    () => exercises.length > 0 && workoutTemplates.some((tpl) => templateSig(tpl.name, tpl.exercises) === currentSig),
    [workoutTemplates, currentSig, exercises.length],
  );

  const handleSaveTemplate = () => {
    if (!resolvedName) {
      alertDialog(t('workoutPrep.nameRequiredTitle'), t('workoutPrep.nameRequiredOrType'));
      return;
    }
    if (exercises.length === 0) {
      alertDialog(t('workoutPrep.noExercisesTitle'), t('workoutPrep.noExercisesSaveMsg'));
      return;
    }
    setTemplateName(resolvedName); // prefill, user can override (optional)
    setShowSaveModal(true);
  };

  const confirmSaveTemplate = () => {
    if (alreadySaved && !editingId) { setShowSaveModal(false); return; } // never save the same template twice
    const name = templateName.trim() || resolvedName;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const payload = {
      userId: user?.id || 'u1',
      name,
      workoutType: workoutType || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      exercises: exercises.map(e => ({
        exerciseId: e.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        restSeconds: e.restSeconds,
        sets: e.sets,
        isCustom: e.isCustom,
        ...(e.combo ? { combo: true, unbroken: e.unbroken, components: e.components, comboRounds: e.comboRounds, mode: e.mode ?? 'circuit', intervalSeconds: e.intervalSeconds ?? 60, timeCapSeconds: e.timeCapSeconds } : {}),
        ...(e.kind === 'intervals' ? { kind: 'intervals' as const, intervals: e.intervals } : {}),
      })),
    };
    if (editingId) {
      updateWorkoutTemplate(editingId, payload);
      setShowSaveModal(false);
      alertDialog(t('workoutPrep.updatedTitle', { defaultValue: 'Workout updated' }), t('workoutPrep.updatedMsg', { name, defaultValue: '"{{name}}" has been updated.' }));
      return;
    }
    addWorkoutTemplate(payload);
    setShowSaveModal(false);
    alertDialog(t('workoutPrep.savedTitle'), t('workoutPrep.savedToMyWorkouts', { name }));
  };

  const handleStartWorkout = async () => {
    if (!resolvedName) {
      alertDialog(t('workoutPrep.nameRequiredTitle'), workoutType === 'Custom' ? t('workoutPrep.nameRequiredCustom') : t('workoutPrep.nameRequiredSelectOrEnter'));
      return;
    }
    if (exercises.length === 0) {
      alertDialog(t('workoutPrep.noExercisesTitle'), t('workoutPrep.noExercisesStartMsg'));
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActiveSession({
      workoutName: resolvedName,
      workoutType: workoutType || undefined,
      startTimestamp: Date.now(),
      preWorkout: false, // toggled in-session via the pre-workout card (no start dialog)
      exercises: exercises.map(e => {
        if (e.kind === 'intervals') {
          // Live interval execution is a later phase; carry the block through as-is.
          return {
            exerciseId: e.exerciseId,
            name: e.name,
            muscleGroup: e.muscleGroup,
            restSeconds: e.restSeconds,
            sets: [],
            kind: 'intervals' as const,
            intervals: e.intervals,
          };
        }
        if (e.combo && e.components) {
          return {
            exerciseId: e.exerciseId,
            name: e.name,
            muscleGroup: e.muscleGroup,
            restSeconds: e.restSeconds,
            sets: [],
            combo: true,
            unbroken: e.unbroken,
            mode: e.mode ?? 'circuit',
            intervalSeconds: e.intervalSeconds ?? 60,
            timeCapSeconds: e.timeCapSeconds,
            components: e.components.map(c => ({ exerciseId: c.exerciseId, name: c.name, muscleGroup: c.muscleGroup })),
            rounds: Array.from({ length: Math.max(1, e.comboRounds ?? 1) }, () => ({
              status: 'pending' as const,
              entries: e.components!.map(c => componentToSetConfig(c)),
            })),
          };
        }
        return {
          exerciseId: e.exerciseId,
          name: e.name,
          muscleGroup: e.muscleGroup,
          restSeconds: e.restSeconds,
          sets: e.sets.map(setConfig => ({
            config: { ...setConfig },
            actual: { ...setConfig },
            status: 'pending' as const,
          })),
        };
      }),
      ...(enrollmentId && slotDay != null ? { program: {
        enrollmentId, weekIndex: Number(weekIndex), slotDay: Number(slotDay),
        templateExerciseIds: (programs.find(p => p.id === programId)?.days ?? [])
          .find(d => d.weekIndex === Number(weekIndex) && d.dayIndex === Number(slotDay))?.exercises
          ?.map((e: any) => e.exerciseId) ?? [],
      } } : subEnroll && subDay != null ? { program: {
        enrollmentId: subEnroll, weekIndex: Number(subWeek), slotDay: Number(subDay), substitute: true,
      } } : {}),
    });
    // replace (not push) so Back from the live session never returns to this "new workout" page
    router.replace('/live-workout' as any);
  };

  // program mode: save the built exercises onto the program day (inline workout)
  const handleSaveToProgram = () => {
    if (!programId) return;
    if (exercises.length === 0) { alertDialog(t('workoutPrep.noExercisesTitle'), t('workoutPrep.noExercisesSaveMsg')); return; }
    const prog = programs.find(p => p.id === programId);
    if (!prog) return;
    const w = Number(weekIndex), d = Number(dayIndex);
    const mapped = exercises.map(e => ({
      exerciseId: e.exerciseId, name: e.name, muscleGroup: e.muscleGroup, restSeconds: e.restSeconds, sets: e.sets, isCustom: e.isCustom,
      ...(e.combo ? { combo: true, unbroken: e.unbroken, components: e.components, comboRounds: e.comboRounds, mode: e.mode, intervalSeconds: e.intervalSeconds, timeCapSeconds: e.timeCapSeconds } : {}),
      ...(e.kind === 'intervals' ? { kind: 'intervals' as const, intervals: e.intervals } : {}),
    }));
    const existing = (prog.days ?? []).find(x => x.weekIndex === w && x.dayIndex === d);
    const rest = (prog.days ?? []).filter(x => !(x.weekIndex === w && x.dayIndex === d));
    // the day's label IS the training type (resolvedName) — no separate label field needed
    const day = { weekIndex: w, dayIndex: d, restDay: false, templateId: null, name: resolvedName || (existing?.name ?? ''), exercises: mapped as any, label: resolvedName || existing?.label || '', notes: existing?.notes ?? '' };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProgram(programId, { name: prog.name, startDate: prog.startDate ?? null, weeks: prog.weeks, notes: prog.notes ?? '', days: [...rest, day] });
    alertDialog(t('programs.saveToProgram', { defaultValue: 'Saved to program' }), '');
    router.back();
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <LinearGradient
          colors={[fadeMid, fadeSoft, 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text}>{t('workoutPrep.newWorkout')}</Display>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad + 60, paddingBottom: 180 }}
        keyboardShouldPersistTaps="handled"
      >
          {exercises.length === 0 && (
            <View style={{ marginBottom: 14 }}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTemplatePicker(true); }}
                style={({ pressed }) => [s.loadTemplateBtn, { backgroundColor: theme.card, borderColor: Colors.primary + '30', opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name="download-outline" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.loadTemplateBtnTitle, { color: theme.text }]}>{t('workoutPrep.loadFromMyWorkouts')}</Text>
                  <Text style={[s.loadTemplateBtnSub, { color: theme.textMuted }]}>
                    {workoutTemplates.length > 0 ? t('workoutPrep.savedWorkoutsAvailable', { count: workoutTemplates.length }) : t('workoutPrep.noSavedYet', { defaultValue: 'No saved workouts yet' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            </View>
          )}

          <WorkoutBuilder
            workoutType={workoutType}
            exercises={exercises}
            onChangeType={setWorkoutType}
            onChangeExercises={setExercises}
            theme={theme}
            workoutName={workoutName}
            onChangeName={setWorkoutName}
            onViewAsText={() => setShowText(true)}
          />
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 }]}>
        <LinearGradient
          colors={['transparent', fadeMid, fadeSolid]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.bottomRow}>
          {/* running a program day → Start live (no save). authoring a day → Save to Program.
              normal workout → Save template + Start. */}
          {!isRunning && (
            <Pressable
              onPress={inProgram ? handleSaveToProgram : handleSaveTemplate}
              disabled={!inProgram && alreadySaved && !editingId}
              style={({ pressed }) => [s.templateBtn, inProgram && { flex: 1 }, { opacity: (!inProgram && alreadySaved && !editingId) ? 0.6 : pressed ? 0.9 : 1, backgroundColor: inProgram ? Colors.electric : theme.card, borderColor: inProgram ? Colors.electric : (editingId || alreadySaved) ? Colors.primary : theme.border }]}
            >
              <Ionicons name={inProgram ? 'calendar-outline' : editingId ? 'save-outline' : alreadySaved ? 'checkmark-circle' : 'bookmark-outline'} size={16} color={inProgram ? '#04120B' : Colors.primary} />
              <Text style={[s.templateBtnText, { color: inProgram ? '#04120B' : (editingId || alreadySaved) ? Colors.primary : theme.text }]}>{inProgram ? t('programs.saveToProgram', { defaultValue: 'Save to Program' }) : editingId ? t('workoutPrep.update', { defaultValue: 'Update' }) : alreadySaved ? t('workoutPrep.saved') : t('workoutPrep.save')}</Text>
            </Pressable>
          )}

          {(!inProgram || isRunning) && (
            <UIButton
              variant="solid"
              icon="flash"
              label={t('workoutPrep.startWorkout')}
              onPress={handleStartWorkout}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>

      <WorkoutTextModal
        visible={showText}
        onClose={() => setShowText(false)}
        title={resolvedName || t('workoutPrep.newWorkout', { defaultValue: 'Workout' })}
        exercises={exercises as any[]}
      />

      <TemplatePickerModal
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleLoadTemplate}
        onEdit={handleEditTemplate}
        onDelete={(tmpl) => { deleteWorkoutTemplate(tmpl.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
        templates={workoutTemplates}
        theme={theme}
      />

      <Modal visible={showSaveModal} animationType="fade" transparent onRequestClose={() => setShowSaveModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 20, gap: 14 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>{t('workoutPrep.saveAsTemplate')}</Text>
            <View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 6 }}>{t('workoutPrep.templateNameOptional')}</Text>
              <TextInput
                style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 }}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder={resolvedName || t('workoutPrep.templateNamePlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 6 }}>{t('workoutPrep.leaveBlankToUse', { name: resolvedName })}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable onPress={() => setShowSaveModal(false)} style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('workoutPrep.cancel')}</Text>
              </Pressable>
              <Pressable onPress={confirmSaveTemplate} style={{ flex: 1 }}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 13, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('workoutPrep.save')}</Text>
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
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  nameCard: {
    borderRadius: 16,
    padding: 16,
  },
  nameLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  nameInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  exCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  exCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exCardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 52 },
  typeDropdownSel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeSheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  typeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  typeSheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(140,140,160,0.4)', marginBottom: 14 },
  typeSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  typeSheetTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  typeSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 8 },
  typeSearchInput: { flex: 1, fontSize: 16 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  typeSelectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeSelectedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.primary + '18' },
  typeChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  reorderCol: { marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  collapsedSummary: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  toolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginBottom: 4 },
  collapseAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4, marginBottom: 8 },
  collapseAllText: { fontSize: 12, fontWeight: '600' },
  lastPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  lastPerfText: { fontSize: 11.5, fontWeight: '500' },
  reorderBtn: { paddingVertical: 1 },
  cpChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  cpChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpComponents: { paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  cpCompBlock: { gap: 5 },
  cpCompHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpCompCtl: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingLeft: 26 },
  cpTypeChipRow: { flexDirection: 'row', gap: 4 },
  cpTypeChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  cpTypeChipText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpFieldRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  cpCompIdx: { fontSize: 12, fontWeight: '800', width: 16, textAlign: 'center' },
  cpCompName: { fontSize: 14, fontWeight: '500', flex: 1 },
  cpCompInput: { width: 44, height: 32, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 14, fontWeight: '600', paddingVertical: 0 },
  cpCompUnit: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  cpModeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 12 },
  cpModeSeg: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cpModeSegText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cpCfgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  cpCfgItem: { alignItems: 'center', gap: 6 },
  cpCfgLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  cpStepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cpStepBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cpStepVal: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cpRepsInput: { width: 56, height: 34, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  cpToggle: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  cpToggleDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  cpToggleSm: { width: 40, height: 23, borderRadius: 12, padding: 3, justifyContent: 'center' },
  cpToggleSmDot: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#fff' },
  dragHandle: {
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muscleTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  setRow: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
    paddingBottom: 4,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  setLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  setFieldsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldMiniLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 17,
    fontWeight: '600',
  },
  assistChip: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, height: 30, borderRadius: 999, borderWidth: 1 },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    backgroundColor: Colors.primary + '0D',
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  restLabel: {
    fontSize: 12,
    flex: 1,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  restChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  restOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  restOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  deleteExText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4458',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed' as any,
  },
  addExBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  addChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: 'dashed' as any,
  },
  addChipText: { fontSize: 13, fontWeight: '700' },
  addSectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 10 },
  addTile: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  addTileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addTileText: { fontSize: 13, fontWeight: '700' },
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  templateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    // fixed tall height (not max/min): search stays pinned at top, list scrolls under
    // the keyboard — sheet no longer resizes/jumps when the keyboard opens.
    height: '90%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  createCustomText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  createCustomGhost: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 8,
  },
  createCustomGhostText: { fontSize: 14, fontWeight: '700' },
  pickerEmpty: { alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 24 },
  pickerEmptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerEmptyTitle: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  pickerEmptySub: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center', lineHeight: 19 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  // Create-custom (Hevy-style) header + rows
  ccHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 14 },
  ccHeaderBtn: { width: 40, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  ccSaveBtn: { paddingHorizontal: 18, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ccSaveText: { fontSize: 14, fontWeight: '700' },
  ccNameInput: { fontSize: 18, fontWeight: '600', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  ccRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  ccRowLabel: { fontSize: 16, fontWeight: '600' },
  ccRowValue: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  // PickerSheet
  pkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  pkSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '72%', paddingHorizontal: 16 },
  pkCatHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  pkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pkOption: { width: '48.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  pkOptionText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  pkDone: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  pkDoneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadTemplateBtnTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadTemplateBtnSub: {
    fontSize: 12,
    marginTop: 2,
  },
  typeChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  typeGridChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  templatePickerRow: { flexDirection: 'row', alignItems: 'center' },
  templateDeleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderRadius: 12 },
  templatePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  templatePickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templatePickerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  templatePickerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  miniMuscleTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
