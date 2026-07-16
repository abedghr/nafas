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

  const renderStep0 = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{t('onboarding.physical_info')}</Text>
      <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
        This helps us calculate your nutrition targets and workout intensity.
      </Text>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('onboarding.height')}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="resize-outline" size={20} color={Colors.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.unitText, { color: theme.textMuted }]}>cm</Text>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('onboarding.weight')}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="scale-outline" size={20} color={Colors.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.unitText, { color: theme.textMuted }]}>kg</Text>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('onboarding.age')}</Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={age}
            onChangeText={setAge}
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.unitText, { color: theme.textMuted }]}>yrs</Text>
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{t('onboarding.gender')}</Text>
        <View style={styles.genderRow}>
          {(['male', 'female'] as const).map(g => (
            <Pressable
              key={g}
              onPress={() => { setGender(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.genderButton,
                { backgroundColor: gender === g ? Colors.primary : theme.card, borderColor: gender === g ? Colors.primary : theme.border },
              ]}
            >
              <Ionicons name={g === 'male' ? 'male-outline' : 'female-outline'} size={20} color={gender === g ? '#fff' : theme.textSecondary} />
              <Text style={[styles.genderText, { color: gender === g ? '#fff' : theme.textSecondary }]}>
                {t(`onboarding.${g}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{t('onboarding.interests')}</Text>
      <Text style={[styles.stepSub, { color: theme.textSecondary }]}>{t('onboarding.select_interests')}</Text>
      <View style={styles.interestsGrid}>
        {sportInterests.map(sport => (
          <Pressable
            key={sport.id}
            onPress={() => toggleInterest(sport.id)}
            style={[
              styles.interestChip,
              {
                backgroundColor: selectedInterests.includes(sport.id) ? Colors.primary : theme.card,
                borderColor: selectedInterests.includes(sport.id) ? Colors.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name={sport.icon as any}
              size={22}
              color={selectedInterests.includes(sport.id) ? '#fff' : theme.textSecondary}
            />
            <Text style={[
              styles.interestText,
              { color: selectedInterests.includes(sport.id) ? '#fff' : theme.text },
            ]}>
              {sport.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{t('onboarding.goals')}</Text>
      <Text style={[styles.stepSub, { color: theme.textSecondary }]}>{t('onboarding.select_goal')}</Text>
      <View style={styles.goalsContainer}>
        {goals.map(goal => (
          <Pressable
            key={goal.id}
            onPress={() => { setSelectedGoal(goal.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={[
              styles.goalCard,
              {
                backgroundColor: selectedGoal === goal.id ? Colors.primary : theme.card,
                borderColor: selectedGoal === goal.id ? Colors.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name={goal.icon as any}
              size={28}
              color={selectedGoal === goal.id ? '#fff' : theme.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.goalText, { color: selectedGoal === goal.id ? '#fff' : theme.text }]}>
                {t(`onboarding.${goal.id}`)}
              </Text>
            </View>
            {selectedGoal === goal.id && (
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
            )}
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );

  const steps = [renderStep0, renderStep1, renderStep2];
  const stepLabels = ['Physical', 'Interests', 'Goals'];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[Colors.primary + '12', 'transparent']}
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
                  backgroundColor: i < step ? Colors.primary : i === step ? Colors.primary : theme.border,
                  width: i === step ? 28 : 8,
                },
              ]}>
                {i < step && <Ionicons name="checkmark" size={8} color="#fff" style={{ marginLeft: i === step ? 0 : undefined }} />}
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
            { color: i === step ? Colors.primary : theme.textMuted, fontFamily: i === step ? 'Rubik_600SemiBold' : 'Rubik_400Regular' },
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
        <Pressable
          onPress={handleNext}
          disabled={saving}
          style={({ pressed }) => [styles.nextButton, { opacity: pressed || saving ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {step === TOTAL_STEPS - 1 ? (saving ? t('discover.save') + '…' : 'Finish Setup') : 'Continue'}
            </Text>
            {!saving && <Ionicons name={step === TOTAL_STEPS - 1 ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 250 },
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
  skipText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  stepLabelRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  stepLabel: { fontSize: 13 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  stepContainer: { flex: 1, paddingTop: 16 },
  stepTitle: { fontSize: 24, fontFamily: 'Rubik_700Bold', marginBottom: 6 },
  stepSub: { fontSize: 14, fontFamily: 'Rubik_400Regular', marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 7 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, height: 52, gap: 12,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'Rubik_400Regular' },
  unitText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  genderText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  interestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14,
    paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  interestText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  goalsContainer: { gap: 12 },
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18,
    borderRadius: 16, borderWidth: 1,
  },
  goalText: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextButton: { borderRadius: 16, overflow: 'hidden' },
  nextButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  nextButtonText: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', color: '#fff' },
});
