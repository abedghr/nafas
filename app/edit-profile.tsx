import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { sportInterests, goals } from '@/lib/mock-data';
import { authApi } from '@/src/features/auth/api';
import { mapMeToProfile } from '@/src/features/auth/session';

// Hoisted so it is not remounted every render (inline components steal focus per keystroke).
function Field({ label, value, onChange, unit, keyboard, theme, autoCapitalize, autoCorrect, prefix }: any) {
  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {!!prefix && <Text style={[styles.unit, { color: theme.textMuted }]}>{prefix}</Text>}
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          autoCorrect={autoCorrect !== false}
          placeholderTextColor={theme.textMuted}
        />
        {!!unit && <Text style={[styles.unit, { color: theme.textMuted }]}>{unit}</Text>}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, setUser, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [goal, setGoal] = useState(user?.goal || 'build_muscle');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const toggleInterest = (id: string) => { Haptics.selectionAsync(); setInterests(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); };

  const save = async () => {
    if (saving) return;
    const uname = username.trim().toLowerCase();
    const mail = email.trim().toLowerCase();
    if (uname && uname.length < 3) {
      await alertDialog(t('discover.username'), t('discover.username_too_short')); return;
    }
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      await alertDialog(t('discover.email'), t('discover.email_invalid')); return;
    }
    setSaving(true);
    const patch: Record<string, unknown> = {
      name: name.trim() || user?.name,
      height: parseInt(height) || undefined,
      weight: parseInt(weight) || undefined,
      age: parseInt(age) || undefined,
      gender, goal, interests, bio: bio.trim(),
      profileComplete: true,
    };
    if (uname && uname !== user?.username) patch.username = uname;
    if (mail && mail !== user?.email) patch.email = mail;
    try {
      const me = await authApi.updateMe(patch);
      setUser(mapMeToProfile(me));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      back();
    } catch (e: any) {
      setSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await alertDialog(t('discover.save'), e?.message || t('discover.save_failed'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('discover.edit_profile')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.sectionLabel, { color: theme.text }]}>{t('discover.account')}</Text>
          <Field label={t('discover.full_name')} value={name} onChange={setName} theme={theme} />
          <Field label={t('discover.username')} value={username} onChange={setUsername} theme={theme} prefix="@" autoCapitalize="none" autoCorrect={false} />
          <Field label={t('discover.email')} value={email} onChange={setEmail} theme={theme} keyboard="email-address" autoCapitalize="none" autoCorrect={false} />

          <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 8 }]}>{t('discover.body_stats')}</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Field label={t('onboarding.height')} value={height} onChange={setHeight} unit="cm" keyboard="numeric" theme={theme} /></View>
            <View style={{ flex: 1 }}><Field label={t('onboarding.weight')} value={weight} onChange={setWeight} unit="kg" keyboard="numeric" theme={theme} /></View>
          </View>
          <Field label={t('onboarding.age')} value={age} onChange={setAge} unit="yrs" keyboard="numeric" theme={theme} />

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('onboarding.gender')}</Text>
          <View style={styles.row}>
            {(['male', 'female'] as const).map(g => (
              <Pressable key={g} onPress={() => { setGender(g); Haptics.selectionAsync(); }}
                style={[styles.pill, { flex: 1, backgroundColor: gender === g ? Colors.primary : theme.card, borderColor: gender === g ? Colors.primary : theme.border }]}>
                <Text style={[styles.pillText, { color: gender === g ? '#fff' : theme.textSecondary }]}>{t(`onboarding.${g}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>{t('onboarding.goals')}</Text>
          <View style={styles.wrap}>
            {goals.map(gl => (
              <Pressable key={gl.id} onPress={() => { setGoal(gl.id); Haptics.selectionAsync(); }}
                style={[styles.pill, { backgroundColor: goal === gl.id ? Colors.primary : theme.card, borderColor: goal === gl.id ? Colors.primary : theme.border }]}>
                <Text style={[styles.pillText, { color: goal === gl.id ? '#fff' : theme.textSecondary }]}>{t(`onboarding.${gl.id}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>{t('onboarding.interests')}</Text>
          <View style={styles.wrap}>
            {sportInterests.map(s => (
              <Pressable key={s.id} onPress={() => toggleInterest(s.id)}
                style={[styles.pill, { backgroundColor: interests.includes(s.id) ? Colors.primary : theme.card, borderColor: interests.includes(s.id) ? Colors.primary : theme.border }]}>
                <Ionicons name={s.icon as any} size={16} color={interests.includes(s.id) ? '#fff' : theme.textSecondary} />
                <Text style={[styles.pillText, { color: interests.includes(s.id) ? '#fff' : theme.textSecondary }]}>{s.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.group, { marginTop: 16 }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('discover.bio')}</Text>
            <TextInput style={[styles.input, styles.bio, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={bio} onChangeText={setBio} multiline placeholderTextColor={theme.textMuted} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12 }]}>
        <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: Colors.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={styles.saveText}>{saving ? t('discover.save') + '…' : t('discover.save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 15, fontFamily: 'Rubik_700Bold', marginBottom: 12, marginTop: 4 },
  group: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, gap: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Rubik_400Regular' },
  unit: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  row: { flexDirection: 'row', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  pillText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  bio: { height: 90, borderWidth: 1, borderRadius: 14, padding: 14, textAlignVertical: 'top' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  saveBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
});
