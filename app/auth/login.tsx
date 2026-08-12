import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  ScrollView, KeyboardAvoidingView, Image,
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
import { persistSession } from '@/src/features/auth/session';

const NAFAS_LOGO = require('../../assets/images/icon.png');
const DANGER = Colors.semantic.danger;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { setUser, setOnboardingComplete, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('authx.errEnterEmailPassword'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError('');
    try {
      const pair = await authApi.login({ email: email.trim().toLowerCase(), password });
      const profile = await persistSession(pair);
      setUser(profile);
      setOnboardingComplete(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code === 'EMAIL_NOT_VERIFIED') {
        await authApi.requestOtp({ email: email.trim().toLowerCase(), purpose: 'verify' }).catch(() => {});
        router.push({ pathname: '/auth/verify-otp', params: { email: email.trim().toLowerCase() } });
        return;
      }
      setError(e.message || t('authx.errLoginFailed'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (_provider: 'google' | 'apple') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setError(t('authx.errSocialComingSoon'));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 8 : insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={styles.hero}>
              <Image source={NAFAS_LOGO} style={styles.nafasLogo} resizeMode="cover" />
              <Display variant="d1" color={theme.text} style={styles.heroTitle}>{t('authx.welcomeBack')}</Display>
              <Text style={[styles.heroSub, { color: theme.textSecondary }]}>{t('authx.logInToNafas')}</Text>
            </View>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: DANGER + '1F', borderColor: DANGER + '40' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.email')}</Text>
              <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: email ? Colors.electric : theme.border }]}>
                <Ionicons name="mail-outline" size={18} color={Colors.electric} />
                <TextInput
                  style={[styles.fieldInput, { color: theme.text }]}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder={t('authx.emailPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.password')}</Text>
                <Pressable onPress={() => router.push('/auth/forgot-password')}>
                  <Text style={[styles.forgotText, { color: Colors.electric }]}>{t('authx.forgotPassword')}</Text>
                </Pressable>
              </View>
              <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: password ? Colors.electric : theme.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.electric} />
                <TextInput
                  ref={passRef}
                  style={[styles.fieldInput, { color: theme.text }]}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  placeholder={t('authx.passwordPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(p => !p)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textMuted} />
                </Pressable>
              </View>
            </View>

            <Button
              variant="primary"
              label={loading ? t('authx.loggingIn') : t('authx.logIn')}
              onPress={handleLogin}
              disabled={loading}
              playIcon="arrow-forward"
              style={{ marginTop: 8 }}
            />

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>{t('authx.orContinueWith')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.socialRow}>
              <Button
                variant="ghost"
                icon="logo-google"
                label={t('authx.google')}
                onPress={() => handleSocial('google')}
                style={{ flex: 1 }}
              />
              {Platform.OS === 'ios' && (
                <Button
                  variant="ghost"
                  icon="logo-apple"
                  label={t('authx.apple')}
                  onPress={() => handleSocial('apple')}
                  style={{ flex: 1 }}
                />
              )}
            </View>

            <Pressable onPress={() => router.push('/auth/register')} style={styles.signupLink}>
              <Text style={[styles.signupLinkText, { color: theme.textMuted }]}>
                {t('authx.noAccount')}{' '}
                <Text style={{ fontFamily: Fonts.semibold, color: Colors.electric }}>{t('authx.signUp')}</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 4,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 12 },
  hero: { marginBottom: 32 },
  nafasLogo: { width: 52, height: 52, borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  heroTitle: { marginBottom: 6 },
  heroSub: { fontSize: 15, fontFamily: Fonts.regular },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  errorBannerText: { fontSize: 13, fontFamily: Fonts.regular, color: DANGER, flex: 1 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.medium, marginBottom: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  forgotText: { fontSize: 13, fontFamily: Fonts.medium },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1, paddingHorizontal: 14, height: 52, gap: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: Fonts.regular },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: Fonts.regular },
  socialRow: { flexDirection: 'row', gap: 12 },
  signupLink: { alignItems: 'center', paddingVertical: 20 },
  signupLinkText: { fontSize: 14, fontFamily: Fonts.regular },
});
