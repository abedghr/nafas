import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  ScrollView, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, Button } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { authApi } from '@/src/features/auth/api';

type Step = 'email' | 'otp' | 'password';

const DANGER = Colors.semantic.danger;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRef0 = useRef<TextInput>(null);
  const otpRef1 = useRef<TextInput>(null);
  const otpRef2 = useRef<TextInput>(null);
  const otpRef3 = useRef<TextInput>(null);
  const otpRef4 = useRef<TextInput>(null);
  const otpRef5 = useRef<TextInput>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3, otpRef4, otpRef5];

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError(t('authx.errValidEmail'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setResendTimer(60);
      setStep('otp');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || t('authx.errCouldNotSendCode'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const d = val.replace(/[^0-9]/g, '');
    const next = [...otp]; next[idx] = d;
    setOtp(next);
    if (d && idx < 5) otpRefs[idx + 1].current?.focus();
    setError('');
  };

  const handleOtpKey = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
      const next = [...otp]; next[idx - 1] = '';
      setOtp(next);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.join('').length < 6) {
      setError(t('authx.errEnter6Digit'));
      return;
    }
    // Reset OTP is validated server-side at the reset step; just advance.
    setStep('password');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      setError(t('authx.errPasswordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('authx.errPasswordsNoMatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        code: otp.join(''),
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/auth/login');
    } catch (e: any) {
      setError(e.message || t('authx.errResetFailed'));
      setStep('otp'); // bad/expired code → back to code entry
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {(['email', 'otp', 'password'] as Step[]).map((s, i) => (
        <View key={s} style={styles.stepRow}>
          <View style={[styles.stepDot, {
            backgroundColor: step === s ? Colors.electric : (
              (step === 'otp' && i === 0) || (step === 'password' && i <= 1)
                ? Colors.electric + '60' : theme.border
            ),
          }]}>
            {((step === 'otp' && i === 0) || (step === 'password' && i <= 1)) ? (
              <Ionicons name="checkmark" size={12} color="#04120B" />
            ) : (
              <Text style={[styles.stepDotText, { color: step === s ? '#04120B' : theme.textMuted }]}>{i + 1}</Text>
            )}
          </View>
          {i < 2 && <View style={[styles.stepLine, { backgroundColor: (step === 'otp' && i === 0) || (step === 'password' && i <= 1) ? Colors.electric + '60' : theme.border }]} />}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Pressable onPress={() => step === 'email' ? router.back() : setStep(step === 'password' ? 'otp' : 'email')} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>{t('authx.resetPassword')}</Display>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator />

          {step === 'email' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: Colors.electric + '1F' }]}>
                  <Ionicons name="mail-outline" size={28} color={Colors.electric} />
                </View>
                <Display variant="d2" color={theme.text} style={styles.stepTitle}>{t('authx.enterYourEmail')}</Display>
                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                  {t('authx.resetCodeInfo')}
                </Text>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.emailAddress')}</Text>
                <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: error ? DANGER : email ? Colors.electric : theme.border }]}>
                  <Ionicons name="mail-outline" size={18} color={Colors.electric} />
                  <TextInput
                    style={[styles.fieldInput, { color: theme.text }]}
                    value={email}
                    onChangeText={v => { setEmail(v); setError(''); }}
                    placeholder={t('authx.emailPlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                    autoFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
              <ActionBtn label={loading ? t('authx.sending') : t('authx.sendResetCode')} onPress={handleSendCode} loading={loading} />
            </Animated.View>
          )}

          {step === 'otp' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: Colors.electric + '1F' }]}>
                  <Ionicons name="keypad-outline" size={28} color={Colors.electric} />
                </View>
                <Display variant="d2" color={theme.text} style={styles.stepTitle}>{t('authx.enterTheCode')}</Display>
                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                  {t('authx.sent6DigitCode')}{'\n'}<Text style={{ fontFamily: Fonts.semibold, color: theme.text }}>{email}</Text>
                </Text>
              </View>
              <View style={styles.otpContainer}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={otpRefs[i]}
                    style={[styles.otpBox, { backgroundColor: theme.card, borderColor: d ? Colors.electric : error ? DANGER : theme.border, color: theme.text }]}
                    value={d}
                    onChangeText={v => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKey(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                ))}
              </View>
              {error ? <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text> : null}
              <Pressable onPress={() => resendTimer === 0 && handleSendCode()} style={styles.resendBtn}>
                <Text style={[styles.resendText, { color: resendTimer > 0 ? theme.textMuted : Colors.electric }]}>
                  {resendTimer > 0 ? t('authx.resendIn', { seconds: resendTimer }) : t('authx.resendCode')}
                </Text>
              </Pressable>
              <ActionBtn label={loading ? t('authx.verifying') : t('authx.verifyCode')} onPress={handleVerifyOtp} loading={loading} disabled={otp.join('').length < 6} />
            </Animated.View>
          )}

          {step === 'password' && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: Colors.electric + '1F' }]}>
                  <Ionicons name="lock-closed-outline" size={28} color={Colors.electric} />
                </View>
                <Display variant="d2" color={theme.text} style={styles.stepTitle}>{t('authx.newPasswordTitle')}</Display>
                <Text style={[styles.stepSub, { color: theme.textSecondary }]}>
                  {t('authx.newPasswordInfo')}
                </Text>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.newPassword')}</Text>
                <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: newPassword ? Colors.electric : theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.electric} />
                  <TextInput
                    style={[styles.fieldInput, { color: theme.text }]}
                    value={newPassword}
                    onChangeText={v => { setNewPassword(v); setError(''); }}
                    placeholder={t('authx.minCharsPlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    autoFocus
                  />
                  <Pressable onPress={() => setShowPassword(p => !p)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.confirmPassword')}</Text>
                <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: confirmPassword ? Colors.electric : theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.electric} />
                  <TextInput
                    style={[styles.fieldInput, { color: theme.text }]}
                    value={confirmPassword}
                    onChangeText={v => { setConfirmPassword(v); setError(''); }}
                    placeholder={t('authx.repeatPasswordPlaceholder')}
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <ActionBtn label={loading ? t('authx.saving') : t('authx.setNewPassword')} onPress={handleResetPassword} loading={loading} />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ActionBtn({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Button
      variant="primary"
      label={label}
      onPress={onPress}
      disabled={loading || disabled}
      playIcon="arrow-forward"
      style={{ marginTop: 8 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 12, fontFamily: Fonts.semibold },
  stepLine: { width: 40, height: 2, marginHorizontal: 4 },
  stepHeader: { alignItems: 'center', marginBottom: 32 },
  stepIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  stepTitle: { marginBottom: 8, textAlign: 'center' },
  stepSub: { fontSize: 14, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.medium, marginBottom: 7 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1, paddingHorizontal: 14, height: 52, gap: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: Fonts.regular },
  errorText: { fontSize: 12, fontFamily: Fonts.regular, color: DANGER, marginTop: 5 },
  otpContainer: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 12 },
  otpBox: {
    width: 46, height: 54, borderRadius: 12, borderWidth: 2,
    textAlign: 'center', fontSize: 20, fontFamily: Fonts.monoBold,
  },
  resendBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 16 },
  resendText: { fontSize: 14, fontFamily: Fonts.medium },
});
