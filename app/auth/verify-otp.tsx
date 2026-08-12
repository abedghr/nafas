import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput, Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { persistSession } from '@/src/features/auth/session';

const DANGER = Colors.semantic.danger;

export default function VerifyOTPScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { setUser, setOnboardingComplete, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const ref4 = useRef<TextInput>(null);
  const ref5 = useRef<TextInput>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    if (cleaned.length > 1) {
      const digits = cleaned.split('').slice(0, 6);
      const next = [...otp];
      digits.forEach((d, i) => { if (idx + i < 6) next[idx + i] = d; });
      setOtp(next);
      const focusIdx = Math.min(idx + digits.length, 5);
      refs[focusIdx].current?.focus();
      return;
    }
    const next = [...otp];
    next[idx] = cleaned;
    setOtp(next);
    if (cleaned && idx < 5) refs[idx + 1].current?.focus();
    setError('');
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError(t('authx.errEnter6Digit'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      const pair = await authApi.verifyOtp({ email: String(email), code });
      const profile = await persistSession(pair);
      setUser(profile);
      setOnboardingComplete(true);
      // new users must complete their profile first
      router.replace(profile.profileComplete ? '/(tabs)' : '/onboarding');
    } catch (e: any) {
      setError(e.message || t('authx.errVerificationFailed'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendTimer(60);
    setOtp(['', '', '', '', '', '']);
    refs[0].current?.focus();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await authApi.requestOtp({ email: String(email), purpose: 'verify' });
    } catch (e: any) {
      setError(e.message || t('authx.errCouldNotResend'));
    }
  };

  const codeComplete = otp.every(d => d !== '');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#12332A', '#0B1F18']}
            style={styles.iconBg}
          >
            <Ionicons name="mail" size={38} color={Colors.electric} />
          </LinearGradient>
        </View>

        <Display variant="d1" color={theme.text} style={styles.title}>{t('authx.checkYourEmail')}</Display>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('authx.sent6DigitCode')}
        </Text>
        <Text style={[styles.emailText, { color: theme.text }]}>{email}</Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              style={[
                styles.otpBox,
                {
                  backgroundColor: theme.card,
                  borderColor: digit ? Colors.electric : error ? DANGER : theme.border,
                  color: theme.text,
                },
              ]}
              value={digit}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              autoFocus={i === 0}
              returnKeyType={i === 5 ? 'done' : 'next'}
              onSubmitEditing={i === 5 ? () => Keyboard.dismiss() : undefined}
            />
          ))}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <Text style={[styles.hintText, { color: theme.textMuted }]}>
          {t('authx.otpHint')}
        </Text>

        <Pressable onPress={handleResend} disabled={resendTimer > 0} style={styles.resendBtn}>
          <Text style={[styles.resendText, { color: resendTimer > 0 ? theme.textMuted : Colors.electric }]}>
            {resendTimer > 0 ? t('authx.resendCodeIn', { seconds: resendTimer }) : t('authx.didntGetItResend')}
          </Text>
        </Pressable>
      </Animated.View>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 24 }]}>
        <Button
          variant="primary"
          label={loading ? t('authx.verifying') : t('authx.verifyContinue')}
          onPress={handleVerify}
          disabled={loading || !codeComplete}
          playIcon="arrow-forward"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  content: {
    flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40,
  },
  iconContainer: { marginBottom: 24 },
  iconBg: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: Fonts.regular, marginBottom: 4, textAlign: 'center' },
  emailText: { fontSize: 15, fontFamily: Fonts.semibold, marginBottom: 40, textAlign: 'center' },
  otpContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  otpBox: {
    width: 48, height: 56, borderRadius: 14, borderWidth: 2,
    textAlign: 'center', fontSize: 22, fontFamily: Fonts.monoBold,
  },
  errorText: { fontSize: 13, fontFamily: Fonts.regular, color: DANGER, marginBottom: 8 },
  hintText: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 20, textAlign: 'center' },
  resendBtn: { paddingVertical: 8 },
  resendText: { fontSize: 14, fontFamily: Fonts.medium },
  footer: { paddingHorizontal: 24 },
});
