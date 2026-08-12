import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
  TextInput, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Duration } from '@/constants/motion';
import { Display, Button, Chip } from '@/components/ui';
import { sportInterests, goals } from '@/lib/mock-data';
import { authApi } from '@/src/features/auth/api';
import { mapMeToProfile } from '@/src/features/auth/session';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, setUser, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [height, setHeight] = useState(user?.height ? String(user.height) : '175');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '75');
  const [age, setAge] = useState(user?.age ? String(user.age) : '25');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [selectedGoal, setSelectedGoal] = useState(user?.goal || 'build_muscle');

  const TOTAL_STEPS = 3;

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    const patch = {
      height: parseInt(height) || 175,
      weight: parseInt(weight) || 75,
      age: parseInt(age) || 25,
      gender,
      interests: selectedInterests,
      goal: selectedGoal,
      profileComplete: true,
    };
    try {
      const me = await authApi.updateMe(patch);   // persist to server
      setUser(mapMeToProfile(me));
    } catch {
      // offline / error: keep local so the user isn't stuck; server re-syncs on next /me
      if (user) setUser({ ...user, ...patch });
    }
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else finish();
  };

  const handleBack = () => {
    if (step > 0) { setStep(step - 1); }
    else { router.back(); }
  };

  const toggleInterest = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Editorial headline block shared by every step: kicker (0X / 03) + big display title + sub.
  const Headline = ({ title, sub }: { title: string; sub: string }) => (
    <View style={styles.headlineBlock}>
      <Text style={[styles.kicker, { color: Colors.electric }]}>
        {String(step + 1).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
      </Text>
      <Display variant="d1" color={theme.text} style={styles.headline}>{title}</Display>
      <Text style={[styles.stepSub, { color: theme.textSecondary }]}>{sub}</Text>
    </View>
  );

  const renderInput = (
    label: string, value: string, onChange: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap, unit: string,
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={icon} size={20} color={Colors.electric} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={[styles.unitText, { color: theme.textMuted }]}>{unit}</Text>
      </View>
    </View>
  );

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(Duration.slow)} style={styles.stepContainer}>
      <Headline
        title={t('onboarding.physical_info')}
        sub="This helps us calculate your nutrition targets and workout intensity."
      />
      {renderInput(t('onboarding.height'), height, setHeight, 'resize-outline', 'cm')}
      {renderInput(t('onboarding.weight'), weight, setWeight, 'scale-outline', 'kg')}
      {renderInput(t('onboarding.age'), age, setAge, 'calendar-outline', 'yrs')}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('onboarding.gender')}</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as const).map(g => (
            <Chip
              key={g}
              label={t(`onboarding.${g}`)}
              icon={g === 'male' ? 'male-outline' : 'female-outline'}
              active={gender === g}
              onPress={() => setGender(g)}
              style={styles.genderChip}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.duration(Duration.slow)} style={styles.stepContainer}>
      <Headline title={t('onboarding.interests')} sub={t('onboarding.select_interests')} />
      <View style={styles.interestsGrid}>
        {sportInterests.map((sport, i) => (
          <Animated.View key={sport.id} entering={FadeInDown.duration(Duration.base).delay(i * 40)}>
            <Chip
              label={sport.name}
              icon={sport.icon as keyof typeof Ionicons.glyphMap}
              active={selectedInterests.includes(sport.id)}
              onPress={() => toggleInterest(sport.id)}
              style={styles.interestChip}
            />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(Duration.slow)} style={styles.stepContainer}>
      <Headline title={t('onboarding.goals')} sub={t('onboarding.select_goal')} />
      <View style={styles.goalsContainer}>
        {goals.map((goal, i) => {
          const active = selectedGoal === goal.id;
          return (
            <Animated.View key={goal.id} entering={FadeInDown.duration(Duration.base).delay(i * 60)}>
              <Pressable
                onPress={() => { setSelectedGoal(goal.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor: active ? Colors.electric : theme.card,
                    borderColor: active ? Colors.electric : theme.border,
                  },
                ]}
              >
                <View style={[styles.goalIconWrap, { backgroundColor: active ? 'rgba(4,18,11,0.14)' : Colors.electric + '18' }]}>
                  <Ionicons name={goal.icon as any} size={22} color={active ? '#04120B' : Colors.electric} />
                </View>
                <Text style={[styles.goalText, { color: active ? '#04120B' : theme.text }]}>
                  {t(`onboarding.${goal.id}`)}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={24} color="#04120B" />}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );

  const steps = [renderStep0, renderStep1, renderStep2];
  const stepLabels = ['Physical', 'Interests', 'Goals'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Full-bleed brand glow behind the hero — dazzles on first run, works in both themes. */}
      <LinearGradient
        colors={[Colors.electric + '30', Colors.electric + '0A', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradient}
      />
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.progressContainer}>
          {steps.map((_, i) => (
            <View key={i} style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                {
                  backgroundColor: i <= step ? Colors.electric : theme.border,
                  width: i === step ? 28 : 8,
                },
              ]}>
                {i < step && <Ionicons name="checkmark" size={8} color="#04120B" />}
              </View>
            </View>
          ))}
        </View>
        {/* "Later" — enter the app without completing; profile stays incomplete so the banner keeps nudging */}
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: theme.textMuted }]}>{t('onboarding.later')}</Text>
        </Pressable>
      </View>

      <View style={[styles.stepLabelRow, { paddingHorizontal: 24 }]}>
        {stepLabels.map((label, i) => (
          <Text key={i} style={[
            styles.stepLabel,
            { color: i === step ? Colors.electric : theme.textMuted, fontFamily: i === step ? Fonts.semibold : Fonts.regular },
          ]}>
            {label}
          </Text>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {steps[step]()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 16 }]}>
        <Button
          variant="primary"
          label={step === TOTAL_STEPS - 1 ? (saving ? t('discover.save') + '…' : 'Finish Setup') : 'Continue'}
          playIcon={step === TOTAL_STEPS - 1 ? 'checkmark' : 'arrow-forward'}
          onPress={handleNext}
          disabled={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progressStep: { alignItems: 'center' },
  progressDot: {
    height: 8, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  skipText: { fontFamily: Fonts.regular, fontSize: 14 },
  stepLabelRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  stepLabel: { fontSize: 13 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  stepContainer: { flex: 1, paddingTop: 16 },
  headlineBlock: { marginBottom: 28 },
  kicker: { fontFamily: Fonts.monoBold, fontSize: 12, letterSpacing: 2, marginBottom: 10 },
  headline: { marginBottom: 10 },
  stepSub: { ...Type.body, marginBottom: 0 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { ...Type.small, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 16, height: 54, gap: 12,
  },
  input: { flex: 1, fontSize: 16, fontFamily: Fonts.medium },
  unitText: { fontSize: 14, fontFamily: Fonts.regular },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderChip: { flex: 1, height: 50, borderRadius: 14, justifyContent: 'center' },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  interestChip: { height: 42, paddingHorizontal: 16, borderRadius: 14 },
  goalsContainer: { gap: 12 },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16,
    borderRadius: 18, borderWidth: 1,
  },
  goalIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalText: { flex: 1, ...Type.h2 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
