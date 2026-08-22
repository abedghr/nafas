// "Create with AI" — describe a program (or attach a photo of one) and Gemini
// drafts it on the composable model, matched to the exercise library. The draft
// is saved as a normal program opened in edit mode for review.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { workoutApi } from '@/src/features/workout/api';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { Type } from '@/constants/typography';
import { Button } from '@/components/ui';

const SUGGESTIONS = [
  'A 4-week beginner full-body plan, 3 days a week, dumbbells only.',
  '6-day push/pull/legs hypertrophy split, barbell + machines.',
  'Calisthenics endurance, 5 days a week, bar + rings.',
];

export default function AICreateScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, addProgram } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; mimeType: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setImage({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg', data: a.base64 || '' });
  };

  const generate = async () => {
    if (!text.trim() && !image) { alertDialog(t('aiCreate.needInput', { defaultValue: 'Add a description or a photo first.' }), ''); return; }
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const draft = await workoutApi.aiGenerateProgram({
        text: text.trim() || undefined,
        file: image ? { mimeType: image.mimeType, data: image.data } : undefined,
      });
      if (!draft?.days?.length) throw new Error(t('aiCreate.emptyDraft', { defaultValue: 'The AI returned an empty plan. Try rephrasing.' }));
      const id = addProgram(draft);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(('/program/' + id + '?edit=1') as any); // review + tweak before starting
    } catch (e: any) {
      const msg = /AI_UNAVAILABLE|not configured/i.test(String(e?.message)) ? t('aiCreate.unavailable', { defaultValue: 'AI is not set up yet. Add the Gemini key to enable it.' }) : String(e?.message ?? e);
      alertDialog(t('aiCreate.failed', { defaultValue: 'Could not generate' }), msg);
    } finally { setBusy(false); }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Button variant="icon" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/programs' as any))} />
        <Text style={[s.headerTitle, { color: theme.text }]}>{t('aiCreate.title', { defaultValue: 'Create with AI' })}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { backgroundColor: Colors.electric + '14', borderColor: Colors.electric + '33' }]}>
          <Ionicons name="sparkles" size={22} color={Colors.electric} />
          <Text style={[s.heroText, { color: theme.textSecondary }]}>{t('aiCreate.blurb', { defaultValue: 'Describe the program you want, or attach a photo of one. AI drafts it — you review and tweak before starting.' })}</Text>
        </View>

        <Text style={[s.label, { color: theme.textSecondary }]}>{t('aiCreate.describe', { defaultValue: 'Describe your program' })}</Text>
        <TextInput
          style={[s.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          value={text}
          onChangeText={setText}
          placeholder={t('aiCreate.placeholder', { defaultValue: 'e.g. 4-week beginner full-body, 3 days/week, dumbbells only' })}
          placeholderTextColor={theme.textMuted}
          multiline
          editable={!busy}
        />

        <View style={s.suggestRow}>
          {SUGGESTIONS.map((sug) => (
            <Pressable key={sug} onPress={() => setText(sug)} style={[s.chip, { borderColor: theme.border }]} disabled={busy}>
              <Text style={[s.chipText, { color: theme.textSecondary }]} numberOfLines={1}>{sug}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.label, { color: theme.textSecondary, marginTop: 18 }]}>{t('aiCreate.attach', { defaultValue: 'Attach a photo (optional)' })}</Text>
        {image ? (
          <View style={[s.attached, { borderColor: theme.border }]}>
            <Image source={{ uri: image.uri }} style={s.thumb} resizeMode="cover" />
            <Text style={[s.attachedName, { color: theme.text, flex: 1 }]} numberOfLines={1}>{t('aiCreate.photoAttached', { defaultValue: 'Photo attached' })}</Text>
            <Pressable onPress={() => setImage(null)} hitSlop={8} disabled={busy}><Ionicons name="close-circle" size={22} color={theme.textMuted} /></Pressable>
          </View>
        ) : (
          <Pressable onPress={pickImage} style={({ pressed }) => [s.attachBtn, { borderColor: Colors.electric + '55', opacity: pressed ? 0.85 : 1 }]} disabled={busy}>
            <Ionicons name="image-outline" size={18} color={Colors.electric} />
            <Text style={[s.attachBtnText, { color: Colors.electric }]}>{t('aiCreate.addPhoto', { defaultValue: 'Add a photo of a program' })}</Text>
          </Pressable>
        )}

        <Pressable onPress={generate} disabled={busy} style={({ pressed }) => [s.generate, { backgroundColor: Colors.electric, opacity: busy ? 0.7 : pressed ? 0.9 : 1 }]}>
          {busy ? <ActivityIndicator color="#04120B" /> : <Ionicons name="sparkles" size={18} color="#04120B" />}
          <Text style={s.generateText}>{busy ? t('aiCreate.generating', { defaultValue: 'Generating…' }) : t('aiCreate.generate', { defaultValue: 'Generate program' })}</Text>
        </Pressable>
        {busy && <Text style={[s.hint, { color: theme.textMuted }]}>{t('aiCreate.wait', { defaultValue: 'This can take a few seconds.' })}</Text>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  headerTitle: { ...Type.h1, flex: 1, textAlign: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20 },
  heroText: { ...Type.body, flex: 1, fontSize: 13.5 },
  label: { ...Type.caption, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { minHeight: 96, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  suggestRow: { gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 12.5, fontWeight: '500' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' as any },
  attachBtnText: { fontSize: 14, fontWeight: '700' },
  attached: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#fff' },
  attachedName: { ...Type.bodyMed },
  generate: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 27, marginTop: 26 },
  generateText: { color: '#04120B', fontSize: 16, fontWeight: '800' },
  hint: { textAlign: 'center', marginTop: 10, fontSize: 12 },
});
