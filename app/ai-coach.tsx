// AI Coach — a chat inside Workout. The coach knows the athlete's goal, history
// and active program; it asks questions, offers options, and when ready proposes
// a full program the athlete APPROVES before it's saved (opens in edit mode).
// Attach a photo/PDF of an existing program and it transcribes it.
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TextInput, Pressable, Image, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { workoutApi } from '@/src/features/workout/api';
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

type Msg = { role: 'user' | 'model'; text: string; local?: boolean; program?: any; previewUri?: string; fileLabel?: string };
type Att = { mimeType: string; data: string; label: string; previewUri?: string };

export default function AICoachScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, addProgram } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const SUGGESTIONS = [
    t('aiCoach.sug1', { defaultValue: 'Build me a program for my goal' }),
    t('aiCoach.sug2', { defaultValue: '4 days/week, dumbbells only' }),
    t('aiCoach.sug3', { defaultValue: 'Read my program from a photo/PDF' }),
  ];

  const [messages, setMessages] = useState<Msg[]>([
    { role: 'model', local: true, text: t('aiCoach.greeting', { defaultValue: "Hi! I'm your training coach. Tell me your goal, how many days a week you can train, and what equipment you have — or attach a program and I'll read it. I'll put together a plan for you to approve." }) },
  ]);
  const [text, setText] = useState('');
  const [att, setAtt] = useState<Att | null>(null);
  const [busy, setBusy] = useState(false);
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
    try {
      // send only the real exchange (skip the local greeting), Gemini-style roles
      const apiMessages = next.filter((m) => !m.local).map((m) => ({ role: m.role, text: m.text }));
      const r = await workoutApi.aiChat({ messages: apiMessages, files: file ? [{ mimeType: file.mimeType, data: file.data }] : undefined });
      const reply: Msg = r.type === 'proposal'
        ? { role: 'model', text: r.message, program: r.program }
        : { role: 'model', text: r.message };
      setMessages((cur) => [...cur, reply]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg = /AI_UNAVAILABLE|not configured/i.test(String(e?.message)) ? t('aiCreate.unavailable', { defaultValue: 'AI is not set up yet. Add the Gemini key to enable it.' }) : String(e?.message ?? e);
      setMessages((cur) => [...cur, { role: 'model', local: true, text: '⚠️ ' + msg }]);
    } finally { setBusy(false); scrollDown(); }
  };

  const approve = (program: any) => {
    if (!program?.days?.length) { alertDialog(t('aiCoach.emptyPlan', { defaultValue: 'That plan is empty — ask me to try again.' }), ''); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = addProgram(program);
    router.replace(('/program/' + id + '?edit=1') as any); // review + tweak before starting
  };

  return (
    <KeyboardAvoidingView style={[s.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/coach' as any))} />
        <View style={s.headerTitleWrap}>
          <View style={[s.headerBadge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="sparkles" size={15} color={Colors.electric} /></View>
          <Text style={[s.headerTitle, { color: theme.text }]}>{t('aiCoach.title', { defaultValue: 'AI Coach' })}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onContentSizeChange={scrollDown}>
        {messages.map((m, i) => (
          <View key={i} style={{ alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <View style={[s.bubble, m.role === 'user' ? { backgroundColor: Colors.electric } : { backgroundColor: theme.card }]}>
              {m.previewUri && <Image source={{ uri: m.previewUri }} style={s.bubbleImg} resizeMode="cover" />}
              {m.fileLabel && (
                <View style={s.fileChip}><Ionicons name="document-text-outline" size={14} color={m.role === 'user' ? '#04120B' : theme.textSecondary} /><Text style={[s.fileChipText, { color: m.role === 'user' ? '#04120B' : theme.textSecondary }]} numberOfLines={1}>{m.fileLabel}</Text></View>
              )}
              {!!m.text && <Text style={[s.bubbleText, { color: m.role === 'user' ? '#04120B' : theme.text }]}>{m.text}</Text>}
            </View>
            {m.program && <ProposalCard program={m.program} theme={theme} t={t} onApprove={() => approve(m.program)} />}
          </View>
        ))}
        {busy && (
          <View style={{ alignItems: 'flex-start' }}>
            <View style={[s.bubble, { backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <ActivityIndicator size="small" color={Colors.electric} />
              <Text style={[s.bubbleText, { color: theme.textMuted }]}>{t('aiCoach.thinking', { defaultValue: 'Thinking…' })}</Text>
            </View>
          </View>
        )}
        {messages.length <= 1 && !busy && (
          <View style={s.suggestWrap}>
            {SUGGESTIONS.map((sug) => (
              <Pressable key={sug} onPress={() => setText(sug)} style={[s.chip, { borderColor: theme.border }]}>
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

function ProposalCard({ program, theme, t, onApprove }: { program: any; theme: any; t: any; onApprove: () => void }) {
  const days = (program.days || []).filter((d: any) => !d.restDay);
  const exCount = days.reduce((a: number, d: any) => a + (d.exercises?.length || 0), 0);
  return (
    <View style={[s.proposal, { backgroundColor: theme.card, borderColor: Colors.electric + '44' }]}>
      <View style={s.proposalHead}>
        <View style={[s.headerBadge, { backgroundColor: Colors.electric + '22' }]}><Ionicons name="barbell" size={15} color={Colors.electric} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[s.proposalName, { color: theme.text }]} numberOfLines={2}>{program.name}</Text>
          <Text style={[s.proposalMeta, { color: theme.textMuted }]}>{t('aiCoach.planMeta', { defaultValue: '{{days}} training days · {{ex}} exercises', days: days.length, ex: exCount })}</Text>
        </View>
      </View>
      {days.slice(0, 4).map((d: any, i: number) => (
        <View key={i} style={s.proposalDay}>
          <Text style={[s.proposalDayName, { color: theme.textSecondary }]} numberOfLines={1}>{d.name}</Text>
          <Text style={[s.proposalDayEx, { color: theme.textMuted }]} numberOfLines={1}>{(d.exercises || []).map((e: any) => e.name).slice(0, 4).join(' · ')}</Text>
        </View>
      ))}
      {days.length > 4 && <Text style={[s.proposalMore, { color: theme.textMuted }]}>{t('aiCoach.moreDays', { defaultValue: '+{{n}} more days', n: days.length - 4 })}</Text>}
      <Pressable onPress={onApprove} style={({ pressed }) => [s.approveBtn, { backgroundColor: Colors.electric, opacity: pressed ? 0.9 : 1 }]}>
        <Ionicons name="checkmark" size={18} color="#04120B" />
        <Text style={s.approveText}>{t('aiCoach.approve', { defaultValue: 'Review & save' })}</Text>
      </Pressable>
      <Text style={[s.approveHint, { color: theme.textMuted }]}>{t('aiCoach.approveHint', { defaultValue: 'Or tell me what to change.' })}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerBadge: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Type.h1 },
  bubble: { maxWidth: '86%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { ...Type.body, fontSize: 15, lineHeight: 21 },
  bubbleImg: { width: 160, height: 120, borderRadius: 10, marginBottom: 8, backgroundColor: '#fff' },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  fileChipText: { fontSize: 12.5, fontWeight: '600', maxWidth: 180 },
  suggestWrap: { gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  chipText: { fontSize: 13, fontWeight: '500' },
  proposal: { marginTop: 8, borderRadius: 16, borderWidth: 1, padding: 14, width: '100%', gap: 8 },
  proposalHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  proposalName: { ...Type.bodyMed, fontWeight: '800', fontSize: 15 },
  proposalMeta: { ...Type.caption, marginTop: 2 },
  proposalDay: { paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)' },
  proposalDayName: { fontSize: 13, fontWeight: '700' },
  proposalDayEx: { fontSize: 12, marginTop: 1 },
  proposalMore: { fontSize: 12, fontStyle: 'italic' },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 14, marginTop: 4 },
  approveText: { color: '#04120B', fontSize: 15, fontWeight: '800' },
  approveHint: { fontSize: 11.5, textAlign: 'center' },
  inputBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingTop: 8 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 8 },
  attThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff' },
  attName: { ...Type.bodyMed, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  attachBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
