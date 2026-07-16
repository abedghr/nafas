import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  ScrollView, KeyboardAvoidingView, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import type { CoachInfo } from '@/lib/app-context';
import { authApi, type Country } from '@/src/features/auth/api';

const SPECIALTIES = ['Fitness Coach', 'Nutrition Coach', 'Strength & Conditioning', 'CrossFit', 'Yoga', 'Football', 'Running', 'Swimming'];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { setUser, setOnboardingComplete, isDark } = useApp();
  const { social, socialName, socialEmail } = useLocalSearchParams<{ social?: string; socialName?: string; socialEmail?: string }>();
  const isSocial = !!social;
  const theme = isDark ? Colors.dark : Colors.light;

  const [name, setName] = useState(socialName || '');
  const [email, setEmail] = useState(socialEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [certInput, setCertInput] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState<string>('');

  useEffect(() => {
    authApi.countries()
      .then(r => {
        setCountries(r.data);
        if (r.data[0]) setCountryId(r.data[0].id); // Jordan (primary) default
      })
      .catch(() => {});
  }, []);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('authx.errNameRequired');
    if (!email.trim() || !email.includes('@')) e.email = t('authx.errValidEmailRequired');
    if (!isSocial) {
      if (password.length < 8) e.password = t('authx.errPasswordMinLength');
      if (password !== confirmPassword) e.confirmPassword = t('authx.errPasswordsNoMatch');
    }
    if (isCoach && !specialty) e.specialty = t('authx.errSelectSpecialty');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addCertification = () => {
    if (certInput.trim()) {
      setCertifications(prev => [...prev, certInput.trim()]);
      setCertInput('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeCert = (i: number) => {
    setCertifications(prev => prev.filter((_, idx) => idx !== i));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrors({});

    const cleanEmail = email.trim().toLowerCase();
    const username =
      name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) +
      '_' + Math.floor(Math.random() * 1000);

    try {
      await authApi.register({
        name: name.trim(),
        username,
        email: cleanEmail,
        password,
        role: isCoach ? 'coach' : 'athlete',
        countryId: countryId || undefined,
      });
      // Backend sent an email OTP; go verify.
      router.push({ pathname: '/auth/verify-otp', params: { email: cleanEmail } });
    } catch (e: any) {
      const map: Record<string, string> = {
        EMAIL_TAKEN: t('authx.errEmailTaken'),
        USERNAME_TAKEN: t('authx.errUsernameTaken'),
      };
      setErrors({ form: map[e.code] || e.message || t('authx.errRegistrationFailed') });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const providerName = social === 'apple' ? 'Apple' : 'Google';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('authx.createAccount')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            {isSocial && (
              <View style={[styles.socialBanner, { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '40' }]}>
                <Ionicons name={social === 'apple' ? 'logo-apple' : 'logo-google'} size={18} color={Colors.primary} />
                <Text style={[styles.socialBannerText, { color: Colors.primary }]}>
                  {t('authx.signingUpWith', { provider: providerName })}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('authx.yourInfo')}</Text>

            <Field
              label={t('authx.fullName')}
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder={t('authx.fullNamePlaceholder')}
              error={errors.name}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              theme={theme}
            />
            <Field
              label={t('authx.email')}
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder={t('authx.emailExamplePlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              inputRef={emailRef}
              returnKeyType="next"
              onSubmitEditing={() => isSocial ? undefined : passRef.current?.focus()}
              theme={theme}
            />

            {!isSocial && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.password')}</Text>
                  <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: errors.password ? '#FF4444' : theme.border }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
                    <TextInput
                      ref={passRef}
                      style={[styles.fieldInput, { color: theme.text }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={t('authx.minCharsPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!showPassword}
                      returnKeyType="next"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                    <Pressable onPress={() => setShowPassword(p => !p)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                    </Pressable>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.confirmPassword')}</Text>
                  <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: errors.confirmPassword ? '#FF4444' : theme.border }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
                    <TextInput
                      ref={confirmRef}
                      style={[styles.fieldInput, { color: theme.text }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder={t('authx.repeatPasswordPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                    />
                  </View>
                  {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                </View>
              </>
            )}

            <View style={styles.sectionDivider} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('authx.areYouCoach')}</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {t('authx.coachVerifiedInfo')}
            </Text>

            <Pressable
              onPress={() => { setIsCoach(p => !p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={[styles.coachToggle, {
                backgroundColor: isCoach ? Colors.primary + '15' : theme.card,
                borderColor: isCoach ? Colors.primary : theme.border,
              }]}
            >
              <View style={[styles.coachToggleIcon, { backgroundColor: isCoach ? Colors.primary + '20' : theme.cardAlt }]}>
                <Ionicons name="school-outline" size={22} color={isCoach ? Colors.primary : theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.coachToggleTitle, { color: theme.text }]}>{t('authx.imACoach')}</Text>
                <Text style={[styles.coachToggleSub, { color: theme.textSecondary }]}>
                  {t('authx.coachToggleSub')}
                </Text>
              </View>
              <View style={[styles.checkbox, { backgroundColor: isCoach ? Colors.primary : 'transparent', borderColor: isCoach ? Colors.primary : theme.border }]}>
                {isCoach && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </Pressable>

            {isCoach && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.coachSection}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.specialty')}</Text>
                <View style={styles.specialtyGrid}>
                  {SPECIALTIES.map(s => (
                    <Pressable
                      key={s}
                      onPress={() => { setSpecialty(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.specialtyChip, {
                        backgroundColor: specialty === s ? Colors.primary : theme.card,
                        borderColor: specialty === s ? Colors.primary : theme.border,
                      }]}
                    >
                      <Text style={[styles.specialtyChipText, { color: specialty === s ? '#fff' : theme.textSecondary }]}>{t(`authx.specialties.${s}`)}</Text>
                    </Pressable>
                  ))}
                </View>
                {errors.specialty ? <Text style={styles.errorText}>{errors.specialty}</Text> : null}

                <Field
                  label={t('authx.yearsOfExperience')}
                  icon="time-outline"
                  value={yearsExp}
                  onChangeText={setYearsExp}
                  placeholder={t('authx.yearsExpPlaceholder')}
                  keyboardType="number-pad"
                  theme={theme}
                />

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.certifications')}</Text>
                  <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="ribbon-outline" size={18} color={Colors.primary} />
                    <TextInput
                      style={[styles.fieldInput, { color: theme.text }]}
                      value={certInput}
                      onChangeText={setCertInput}
                      placeholder={t('authx.certPlaceholder')}
                      placeholderTextColor={theme.textMuted}
                      returnKeyType="done"
                      onSubmitEditing={addCertification}
                    />
                    <Pressable onPress={addCertification} style={[styles.addBtn, { backgroundColor: Colors.primary + '20' }]}>
                      <Ionicons name="add" size={18} color={Colors.primary} />
                    </Pressable>
                  </View>
                  {certifications.length > 0 && (
                    <View style={styles.certsList}>
                      {certifications.map((c, i) => (
                        <View key={i} style={[styles.certTag, { backgroundColor: Colors.primary + '20' }]}>
                          <Text style={[styles.certTagText, { color: Colors.primary }]}>{c}</Text>
                          <Pressable onPress={() => removeCert(i)}>
                            <Ionicons name="close" size={14} color={Colors.primary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {countries.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.country')}</Text>
                <View style={styles.countryRow}>
                  {countries.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { setCountryId(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[styles.countryChip, {
                        backgroundColor: countryId === c.id ? Colors.primary : theme.card,
                        borderColor: countryId === c.id ? Colors.primary : theme.border,
                      }]}
                    >
                      <Text style={{ color: countryId === c.id ? '#fff' : theme.textSecondary, fontFamily: 'Rubik_500Medium', fontSize: 13 }}>
                        {c.name} ({c.currency})
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {errors.form ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FF444420', borderColor: '#FF444440' }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF4444" />
                <Text style={styles.errorBannerText}>{errors.form}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.submitBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtnGradient}
              >
                {loading ? (
                  <Text style={styles.submitBtnText}>{t('authx.creatingAccount')}</Text>
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>{isSocial ? t('authx.createAccount') : t('authx.continue')}</Text>
                    <Ionicons name={isSocial ? 'checkmark' : 'arrow-forward'} size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>

            {!isSocial && (
              <Pressable onPress={() => router.push('/auth/login')} style={styles.loginLink}>
                <Text style={[styles.loginLinkText, { color: theme.textMuted }]}>
                  {t('authx.alreadyMember')}{' '}
                  <Text style={{ fontFamily: 'Rubik_600SemiBold', color: Colors.primary }}>{t('authx.logIn')}</Text>
                </Text>
              </Pressable>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize,
  error, inputRef, returnKeyType, onSubmitEditing, theme,
}: {
  label: string; icon: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any; error?: string;
  inputRef?: React.RefObject<TextInput | null>; returnKeyType?: any; onSubmitEditing?: () => void;
  theme: any;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: error ? '#FF4444' : theme.border }]}>
        <Ionicons name={icon as any} size={18} color={Colors.primary} />
        <TextInput
          ref={inputRef}
          style={[styles.fieldInput, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'words'}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  countryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  errorBannerText: { fontSize: 13, fontFamily: 'Rubik_400Regular', color: '#FF4444', flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Rubik_600SemiBold' },
  scroll: { paddingHorizontal: 24, paddingTop: 8 },
  socialBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, marginBottom: 24,
  },
  socialBannerText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  sectionTitle: { fontSize: 20, fontFamily: 'Rubik_700Bold', marginBottom: 4, marginTop: 8 },
  sectionSubtitle: { fontSize: 13, fontFamily: 'Rubik_400Regular', marginBottom: 16, lineHeight: 18 },
  sectionDivider: { height: 1, backgroundColor: '#2A2A3E', marginVertical: 24 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 7 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1, paddingHorizontal: 14, height: 52, gap: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  errorText: { fontSize: 12, fontFamily: 'Rubik_400Regular', color: '#FF4444', marginTop: 5 },
  coachToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    borderRadius: 16, borderWidth: 2, marginBottom: 16,
  },
  coachToggleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  coachToggleTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 2 },
  coachToggleSub: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  coachSection: { gap: 4, marginBottom: 8 },
  specialtyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  specialtyChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  specialtyChipText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  addBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  certsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  certTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  certTagText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  submitBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 24, marginBottom: 8 },
  submitBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  submitBtnText: { fontSize: 16, fontFamily: 'Rubik_600SemiBold', color: '#fff' },
  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginLinkText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
});
