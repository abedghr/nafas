// AI Coach — a chat inside Workout. The coach knows the athlete's goal, history
// and active program; it asks questions, offers options, and proposes a full
// program. NOTHING is saved until the athlete reviews every day/exercise in the
// proposal card and taps Save (disabled if the plan is empty). Attach a photo/PDF
// of an existing program and it transcribes it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TextInput, Pressable, Image, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { workoutApi } from '@/src/features/workout/api';
import { exerciseLibrary } from '@/src/features/workout/library-cache';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { Type } from '@/constants/typography';
import { Button } from '@/components/ui';

// read a file uri as base64, cross-platform (web blob, native file-system legacy)
async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1] || '');
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  const FS = require('expo-file-system/legacy');
  return FS.readAsStringAsync(uri, { encoding: 'base64' });
}

type Msg = { role: 'user' | 'model'; text: string; local?: boolean; program?: any; workout?: any; previewUri?: string; fileLabel?: string };
type Att = { mimeType: string; data: string; label: string; previewUri?: string };

// one bouncing dot of the typing indicator
function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useSharedValue(0.35);
  useEffect(() => { v.value = withDelay(delay, withRepeat(withTiming(1, { duration: 480 }), -1, true)); }, []);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: -4 * (v.value - 0.35) }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, st]} />;
}

export default function AICoachScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, addProgram, addWorkoutTemplate } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const SUGGESTIONS = [
    t('aiCoach.sug1', { defaultValue: 'Build me a program for my goal' }),
    t('aiCoach.sug2', { defaultValue: '4 days/week, dumbbells only' }),
    t('aiCoach.sug3', { defaultValue: 'Read my program from a photo/PDF' }),
  ];

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'model', local: true, text: t('aiCoach.greeting', { defaultValue: "Hi! I'm your training coach. Tell me your goal, how many days a week you can train, and what equipment you have — or attach a program and I'll read it. I'll put together a plan for you to review." }) },
  ]);
  const [text, setText] = useState('');
  const [att, setAtt] = useState<Att | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollDown = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setAtt({ mimeType: a.mimeType || 'image/jpeg', data: a.base64 || '', label: t('aiCoach.photo', { defaultValue: 'Photo' }), previewUri: a.uri });
  };
  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain'], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await uriToBase64(a.uri);
      if (!data) throw new Error('read failed');
      setAtt({ mimeType: a.mimeType || 'application/pdf', data, label: a.name || 'Document' });
    } catch {
      alertDialog(t('aiCreate.fileFailed', { defaultValue: 'Could not read that file. PDF or text works best (export Word to PDF).' }), '');
    }
  };

  // ponytail: the backend is one request, so we can't stream real progress — walk
  // through plausible prep stages on a timer to show HOW the coach is working.
  const runStages = (withFile: boolean) => {
    const steps = withFile
      ? [t('aiCoach.stageRead', { defaultValue: 'Reading your file…' }), t('aiCoach.stageExtract', { defaultValue: 'Extracting the exercises…' }), t('aiCoach.stageMatch', { defaultValue: 'Matching to your library…' }), t('aiCoach.stageBuild', { defaultValue: 'Building your program…' })]
      : [t('aiCoach.stageThink', { defaultValue: 'Thinking it through…' }), t('aiCoach.stageDesign', { defaultValue: 'Designing your plan…' }), t('aiCoach.stageMatch', { defaultValue: 'Matching to your library…' })];
    let i = 0;
    setStage(steps[0]);
    const id = setInterval(() => { i = Math.min(i + 1, steps.length - 1); setStage(steps[i]); }, 1600);
    return () => clearInterval(id);
  };

  const send = async () => {
    const body = text.trim();
    if ((!body && !att) || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Msg = { role: 'user', text: body || t('aiCoach.sentAttachment', { defaultValue: 'Here is my program.' }), previewUri: att?.previewUri, fileLabel: att && !att.previewUri ? att.label : undefined };
    const next = [...messages, userMsg];
    setMessages(next);
    setText('');
    const file = att; setAtt(null);
    setBusy(true); scrollDown();
    const stopStages = runStages(!!file);
    try {
      // send only the real exchange (skip the local greeting), Gemini-style roles
      const apiMessages = next.filter((m) => !m.local).map((m) => ({ role: m.role, text: m.text }));
      const r = await workoutApi.aiChat({ messages: apiMessages, files: file ? [{ mimeType: file.mimeType, data: file.data }] : undefined });
      const reply: Msg =
        r.type === 'proposal' ? { role: 'model', text: r.message, program: r.program }
        : r.type === 'workout' ? { role: 'model', text: r.message, workout: r.workout }
        : { role: 'model', text: r.message };
      setMessages((cur) => [...cur, reply]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const raw = String(e?.message ?? e);
      const msg = /AI_UNAVAILABLE|not configured/i.test(raw)
        ? t('aiCreate.unavailable', { defaultValue: 'AI is not set up yet. Add the Gemini key to enable it.' })
        : /Load failed|Network|tim</i.test(raw)
        ? t('aiCoach.netError', { defaultValue: 'That took too long or the connection dropped. Try again — a large file can take a while.' })
        : raw;
      setMessages((cur) => [...cur, { role: 'model', local: true, text: '⚠️ ' + msg }]);
    } finally { stopStages(); setStage(''); setBusy(false); scrollDown(); }
  };

  // Save ONLY here, on explicit tap, and only when the plan has real content.
  const saveProgram = (program: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = addProgram(program);
    router.replace(('/program/' + id + '?edit=1') as any); // saved → open to fine-tune/start
  };
  const saveWorkout = (workout: any) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addWorkoutTemplate({ name: workout.name, exercises: workout.exercises } as any); // persists + syncs to server
    router.replace('/saved-workouts' as any); // saved → appears in My Workouts
  };

  return (
    <KeyboardAvoidingView style={[s.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/coach' as any))} />
        <View style={s.headerTitleWrap}>
          <View style={[s.headerBadge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="sparkles" size={15} color={Colors.electric} /></View>
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('aiCoach.title', { defaultValue: 'AI Assistant' })}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onContentSizeChange={scrollDown}>
        {messages.map((m, i) => (
          <Animated.View key={i} entering={FadeInUp.duration(260)} style={[s.msgRow, { justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }]}>
            {m.role === 'model' && (
              <View style={[s.aiAvatar, { backgroundColor: Colors.electric + '1F' }]}><Ionicons name="sparkles" size={13} color={Colors.electric} /></View>
            )}
            <View style={{ flexShrink: 1, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View style={[s.bubble, m.role === 'user' ? { backgroundColor: Colors.electric, borderBottomRightRadius: 6 } : { backgroundColor: theme.card, borderBottomLeftRadius: 6 }]}>
                {m.previewUri && <Image source={{ uri: m.previewUri }} style={s.bubbleImg} resizeMode="cover" />}
                {m.fileLabel && (
                  <View style={s.fileChip}><Ionicons name="document-text-outline" size={14} color={m.role === 'user' ? '#04120B' : theme.textSecondary} /><Text style={[s.fileChipText, { color: m.role === 'user' ? '#04120B' : theme.textSecondary }]} numberOfLines={1}>{m.fileLabel}</Text></View>
                )}
                {!!m.text && <Text style={[s.bubbleText, { color: m.role === 'user' ? '#04120B' : theme.text }]}>{m.text}</Text>}
              </View>
              {m.program && <ProposalCard program={m.program} theme={theme} t={t} onSave={() => saveProgram(m.program)} />}
              {m.workout && <WorkoutCard workout={m.workout} theme={theme} t={t} onSave={() => saveWorkout(m.workout)} />}
            </View>
          </Animated.View>
        ))}
        {busy && (
          <Animated.View entering={FadeInUp.duration(200)} style={[s.msgRow, { justifyContent: 'flex-start' }]}>
            <View style={[s.aiAvatar, { backgroundColor: Colors.electric + '1F' }]}><Ionicons name="sparkles" size={13} color={Colors.electric} /></View>
            <View style={[s.bubble, { backgroundColor: theme.card, borderBottomLeftRadius: 6 }]}>
              <View style={s.typingRow}>
                <View style={s.dots}><Dot delay={0} color={Colors.electric} /><Dot delay={140} color={Colors.electric} /><Dot delay={280} color={Colors.electric} /></View>
                {!!stage && <Text style={[s.stageText, { color: theme.textMuted }]}>{stage}</Text>}
              </View>
            </View>
          </Animated.View>
        )}
        {messages.length <= 1 && !busy && (
          <View style={s.suggestWrap}>
            {SUGGESTIONS.map((sug) => (
              <Pressable key={sug} onPress={() => setText(sug)} style={[s.chip, { borderColor: theme.border }]}>
                <Ionicons name="sparkles-outline" size={13} color={Colors.electric} />
                <Text style={[s.chipText, { color: theme.textSecondary }]} numberOfLines={1}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[s.inputBar, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom + 8 }]}>
        {att && (
          <View style={[s.attRow, { borderColor: theme.border }]}>
            {att.previewUri
              ? <Image source={{ uri: att.previewUri }} style={s.attThumb} resizeMode="cover" />
              : <View style={[s.attThumb, { backgroundColor: Colors.electric + '18', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="document-text-outline" size={18} color={Colors.electric} /></View>}
            <Text style={[s.attName, { color: theme.text, flex: 1 }]} numberOfLines={1}>{att.label}</Text>
            <Pressable onPress={() => setAtt(null)} hitSlop={8}><Ionicons name="close-circle" size={20} color={theme.textMuted} /></Pressable>
          </View>
        )}
        <View style={s.inputRow}>
          <Pressable onPress={pickImage} hitSlop={8} disabled={busy} style={s.attachBtn}><Ionicons name="image-outline" size={22} color={theme.textSecondary} /></Pressable>
          <Pressable onPress={pickFile} hitSlop={8} disabled={busy} style={s.attachBtn}><Ionicons name="attach-outline" size={22} color={theme.textSecondary} /></Pressable>
          <TextInput
            style={[s.input, { backgroundColor: theme.card, color: theme.text }]}
            value={text}
            onChangeText={setText}
            placeholder={t('aiCoach.placeholder', { defaultValue: 'Message your coach…' })}
            placeholderTextColor={theme.textMuted}
            multiline
            editable={!busy}
            onSubmitEditing={send}
          />
          <Pressable onPress={send} disabled={busy || (!text.trim() && !att)} style={[s.sendBtn, { backgroundColor: (text.trim() || att) && !busy ? Colors.electric : theme.cardAlt }]}>
            <Ionicons name="arrow-up" size={20} color={(text.trim() || att) && !busy ? '#04120B' : theme.textMuted} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// compact "3 × 10", "3 × 30s", varied "12/10/8", "· 40kg"
function setLabel(sets: any[] = []): string {
  if (!sets.length) return '';
  const isHold = sets.every((x) => x.durationSeconds != null);
  const vals = sets.map((x) => (isHold ? x.durationSeconds : x.reps)).filter((v) => v != null);
  if (!vals.length) return `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}`;
  const unit = isHold ? 's' : '';
  const uniform = vals.every((v) => v === vals[0]);
  const body = uniform ? `${sets.length} × ${vals[0]}${unit}` : vals.map((v) => `${v}${unit}`).join('/');
  const w = sets.find((x) => x.weight != null)?.weight;
  return w != null ? `${body} · ${w}kg` : body;
}

function ProposalCard({ program, theme, t, onSave }: { program: any; theme: any; t: any; onSave: () => void }) {
  const [open, setOpen] = useState(true);
  const libNames = useMemo(() => new Set(exerciseLibrary.map((e: any) => String(e.name).toLowerCase())), []);
  const days = (program.days || []).filter((d: any) => !d.restDay);
  const allEx = days.flatMap((d: any) => d.exercises || []);
  const exCount = allEx.length;
  const linked = allEx.filter((e: any) => libNames.has(String(e.name).toLowerCase())).length;
  const empty = exCount === 0;

  return (
    <View style={[s.proposal, { backgroundColor: theme.card, borderColor: Colors.electric + '44' }]}>
      <Pressable style={s.proposalHead} onPress={() => setOpen((v) => !v)}>
        <View style={[s.headerBadge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="barbell" size={15} color={Colors.electric} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.proposalName, { color: theme.text }]} numberOfLines={2}>{program.name}</Text>
          <Text style={[s.proposalMeta, { color: theme.textMuted }]}>{t('aiCoach.planMeta', { defaultValue: '{{days}} training days · {{ex}} exercises', days: days.length, ex: exCount })}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
      </Pressable>

      {/* how the coach prepared it — library match summary */}
      {!empty && (
        <View style={[s.matchRow, { backgroundColor: Colors.electric + '12' }]}>
          <Ionicons name="link" size={13} color={Colors.electric} />
          <Text style={[s.matchText, { color: theme.textSecondary }]}>
            {t('aiCoach.linkedSummary', { defaultValue: '{{n}} of {{total}} exercises linked to your library (with demos & tracking)', n: linked, total: exCount })}
          </Text>
        </View>
      )}

      {open && days.map((d: any, i: number) => (
        <View key={i} style={s.proposalDay}>
          <Text style={[s.proposalDayName, { color: theme.text }]} numberOfLines={1}>{d.name}</Text>
          {(d.exercises || []).map((e: any, j: number) => {
            const isLinked = libNames.has(String(e.name).toLowerCase());
            return (
              <View key={j} style={s.proposalExRow}>
                <View style={[s.exDot, { backgroundColor: isLinked ? Colors.electric : theme.textMuted + '55' }]} />
                <Text style={[s.proposalExName, { color: theme.textSecondary }]} numberOfLines={1}>{e.name}</Text>
                <Text style={[s.proposalExSets, { color: theme.textMuted }]}>{setLabel(e.sets)}</Text>
              </View>
            );
          })}
        </View>
      ))}

      <Pressable
        onPress={empty ? undefined : onSave}
        disabled={empty}
        style={({ pressed }) => [s.approveBtn, { backgroundColor: empty ? theme.cardAlt : Colors.electric, opacity: !empty && pressed ? 0.9 : 1 }]}
      >
        <Ionicons name={empty ? 'alert-circle-outline' : 'bookmark'} size={18} color={empty ? theme.textMuted : '#04120B'} />
        <Text style={[s.approveText, { color: empty ? theme.textMuted : '#04120B' }]}>
          {empty ? t('aiCoach.emptyNoSave', { defaultValue: 'Nothing to save yet' }) : t('aiCoach.save', { defaultValue: 'Save to my programs' })}
        </Text>
      </Pressable>
      <Text style={[s.approveHint, { color: theme.textMuted }]}>
        {empty ? t('aiCoach.emptyHint', { defaultValue: 'Ask me to add exercises first.' }) : t('aiCoach.approveHint', { defaultValue: 'Review the days above. Nothing is saved until you tap Save. Or tell me what to change.' })}
      </Text>
    </View>
  );
}

function WorkoutCard({ workout, theme, t, onSave }: { workout: any; theme: any; t: any; onSave: () => void }) {
  const libNames = useMemo(() => new Set(exerciseLibrary.map((e: any) => String(e.name).toLowerCase())), []);
  const exs = workout.exercises || [];
  const linked = exs.filter((e: any) => libNames.has(String(e.name).toLowerCase())).length;
  const empty = exs.length === 0;
  return (
    <View style={[s.proposal, { backgroundColor: theme.card, borderColor: Colors.electric + '44' }]}>
      <View style={s.proposalHead}>
        <View style={[s.headerBadge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="flash" size={15} color={Colors.electric} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.proposalName, { color: theme.text }]} numberOfLines={2}>{workout.name}</Text>
          <Text style={[s.proposalMeta, { color: theme.textMuted }]}>{t('aiCoach.workoutMeta', { defaultValue: 'Single workout · {{n}} exercises', n: exs.length })}</Text>
        </View>
      </View>
      {!empty && (
        <View style={[s.matchRow, { backgroundColor: Colors.electric + '12' }]}>
          <Ionicons name="link" size={13} color={Colors.electric} />
          <Text style={[s.matchText, { color: theme.textSecondary }]}>{t('aiCoach.linkedSummary', { defaultValue: '{{n}} of {{total}} exercises linked to your library (with demos & tracking)', n: linked, total: exs.length })}</Text>
        </View>
      )}
      <View style={s.proposalDay}>
        {exs.map((e: any, j: number) => {
          const isLinked = libNames.has(String(e.name).toLowerCase());
          return (
            <View key={j} style={s.proposalExRow}>
              <View style={[s.exDot, { backgroundColor: isLinked ? Colors.electric : theme.textMuted + '55' }]} />
              <Text style={[s.proposalExName, { color: theme.textSecondary }]} numberOfLines={1}>{e.name}</Text>
              <Text style={[s.proposalExSets, { color: theme.textMuted }]}>{setLabel(e.sets)}</Text>
            </View>
          );
        })}
      </View>
      <Pressable onPress={empty ? undefined : onSave} disabled={empty} style={({ pressed }) => [s.approveBtn, { backgroundColor: empty ? theme.cardAlt : Colors.electric, opacity: !empty && pressed ? 0.9 : 1 }]}>
        <Ionicons name={empty ? 'alert-circle-outline' : 'bookmark'} size={18} color={empty ? theme.textMuted : '#04120B'} />
        <Text style={[s.approveText, { color: empty ? theme.textMuted : '#04120B' }]}>{empty ? t('aiCoach.emptyNoSave', { defaultValue: 'Nothing to save yet' }) : t('aiCoach.saveWorkout', { defaultValue: 'Save workout' })}</Text>
      </Pressable>
      <Text style={[s.approveHint, { color: theme.textMuted }]}>{empty ? t('aiCoach.emptyHint', { defaultValue: 'Ask me to add exercises first.' }) : t('aiCoach.approveHintWorkout', { defaultValue: 'Nothing is saved until you tap Save. Or tell me what to change.' })}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Type.h1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  aiAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubble: { maxWidth: 300, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { ...Type.body, fontSize: 15, lineHeight: 21 },
  bubbleImg: { width: 160, height: 120, borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fileChipText: { fontSize: 12.5, fontWeight: '600', maxWidth: 180 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 8 },
  stageText: { fontSize: 13, fontStyle: 'italic' },
  suggestWrap: { gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  chipText: { fontSize: 13, fontWeight: '500', flexShrink: 1 },
  proposal: { marginTop: 8, borderRadius: 16, borderWidth: 1, padding: 14, width: 300, gap: 8 },
  proposalHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  proposalName: { ...Type.bodyMed, fontWeight: '800', fontSize: 15 },
  proposalMeta: { ...Type.caption, marginTop: 2 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  matchText: { flex: 1, fontSize: 12, lineHeight: 16 },
  proposalDay: { paddingTop: 8, paddingBottom: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  proposalDayName: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  proposalExRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  exDot: { width: 6, height: 6, borderRadius: 3 },
  proposalExName: { flex: 1, fontSize: 13 },
  proposalExSets: { fontSize: 12, fontVariant: ['tabular-nums'] },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, marginTop: 4 },
  approveText: { fontSize: 15, fontWeight: '800' },
  approveHint: { fontSize: 11.5, textAlign: 'center', lineHeight: 16 },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 8 },
  attThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff' },
  attName: { ...Type.bodyMed, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  attachBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
