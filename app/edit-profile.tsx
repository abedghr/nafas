import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { alertDialog } from '@/lib/dialog';
import { Display, Button, Chip, SectionHeader } from '@/components/ui';
import { Fonts, Type } from '@/constants/typography';
import Colors from '@/constants/colors';
import { sportInterests, goals } from '@/lib/mock-data';
import { authApi } from '@/src/features/auth/api';
import { mapMeToProfile } from '@/src/features/auth/session';
import DateTimeField from '@/components/DateTimeField';
import { ageFromISO } from '@/lib/age';

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
  const [birthDate, setBirthDate] = useState<string | null>(user?.birthDate ?? null);
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
      birthDate: birthDate ? birthDate.split('T')[0] : undefined,
      age: (birthDate ? ageFromISO(birthDate) : undefined) ?? undefined,
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

  const initial = (name || user?.name || 'N').trim().charAt(0).toUpperCase() || 'N';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Button variant="icon" icon="chevron-back" onPress={back} />
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('discover.edit_profile')}</Display>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing, { borderColor: Colors.electric, backgroundColor: theme.background }]}>
              <View style={[styles.avatarInner, { backgroundColor: theme.card }]}>
                <Display variant="d1" color={Colors.electric}>{initial}</Display>
              </View>
            </View>
          </View>

          <SectionHeader title={t('discover.account')} style={styles.section} />
          <Field label={t('discover.full_name')} value={name} onChange={setName} theme={theme} />
          <Field label={t('discover.username')} value={username} onChange={setUsername} theme={theme} prefix="@" autoCapitalize="none" autoCorrect={false} />
          <Field label={t('discover.email')} value={email} onChange={setEmail} theme={theme} keyboard="email-address" autoCapitalize="none" autoCorrect={false} />

          <SectionHeader title={t('discover.body_stats')} style={styles.section} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}><Field label={t('onboarding.height')} value={height} onChange={setHeight} unit="cm" keyboard="numeric" theme={theme} /></View>
            <View style={{ flex: 1 }}><Field label={t('onboarding.weight')} value={weight} onChange={setWeight} unit="kg" keyboard="numeric" theme={theme} /></View>
          </View>
          <DateTimeField
            label={t('onboarding.dateOfBirth', { defaultValue: 'Date of birth' }) + (birthDate ? ` · ${ageFromISO(birthDate)} ${t('onboarding.yearsOld', { defaultValue: 'yrs' })}` : '')}
            value={birthDate}
            onChange={setBirthDate}
            dateOnly
            maxDate={new Date()}
            theme={theme}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('onboarding.gender')}</Text>
          <View style={styles.row}>
            {(['male', 'female'] as const).map(g => (
              <Chip
                key={g}
                label={t(`onboarding.${g}`)}
                active={gender === g}
                onPress={() => { setGender(g); Haptics.selectionAsync(); }}
                style={styles.genderChip}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>{t('onboarding.goals')}</Text>
          <View style={styles.wrap}>
            {goals.map(gl => (
              <Chip
                key={gl.id}
                label={t(`onboarding.${gl.id}`)}
                active={goal === gl.id}
                onPress={() => { setGoal(gl.id); Haptics.selectionAsync(); }}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 16 }]}>{t('onboarding.interests')}</Text>
          <View style={styles.wrap}>
            {sportInterests.map(s => (
              <Chip
                key={s.id}
                label={s.name}
                icon={s.icon as any}
                active={interests.includes(s.id)}
                onPress={() => toggleInterest(s.id)}
              />
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
        <Button
          variant="solid"
          label={saving ? t('discover.save') + '…' : t('discover.save')}
          onPress={save}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  headerTitle: { flex: 1, textAlign: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', paddingTop: 4, paddingBottom: 12 },
  avatarRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center', padding: 4 },
  avatarInner: { flex: 1, alignSelf: 'stretch', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 12 },
  group: { marginBottom: 14 },
  label: { ...Type.small, marginBottom: 7 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, height: 52, gap: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: Fonts.regular },
  unit: { fontSize: 14, fontFamily: Fonts.regular },
  row: { flexDirection: 'row', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: { flex: 1, height: 44, justifyContent: 'center' },
  bio: { height: 90, borderWidth: 1, borderRadius: 14, padding: 14, textAlignVertical: 'top' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
});
