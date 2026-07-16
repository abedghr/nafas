import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  ScrollView, KeyboardAvoidingView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { authApi } from '@/src/features/auth/api';
import { persistSession } from '@/src/features/auth/session';

const NAFAS_LOGO = require('../../assets/images/icon.png');

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('authx.welcomeBack')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 60 : insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={styles.logoRow}>
              <Image source={NAFAS_LOGO} style={styles.nafasLogo} resizeMode="cover" />
              <Text style={[styles.welcomeText, { color: theme.text }]}>{t('authx.logInToNafas')}</Text>
            </View>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FF444420', borderColor: '#FF444440' }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF4444" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('authx.email')}</Text>
              <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="mail-outline" size={18} color={Colors.primary} />
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
                  <Text style={[styles.forgotText, { color: Colors.primary }]}>{t('authx.forgotPassword')}</Text>
                </Pressable>
              </View>
              <View style={[styles.fieldRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
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

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [styles.loginBtn, { opacity: pressed || loading ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGradient}
              >
                <Text style={styles.loginBtnText}>{loading ? t('authx.loggingIn') : t('authx.logIn')}</Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
              </LinearGradient>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textMuted }]}>{t('authx.orContinueWith')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.socialRow}>
              <Pressable
                onPress={() => handleSocial('google')}
                style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.googleDot}><Text style={styles.googleDotText}>G</Text></View>
                <Text style={[styles.socialBtnText, { color: theme.text }]}>{t('authx.google')}</Text>
              </Pressable>
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={() => handleSocial('apple')}
                  style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Ionicons name="logo-apple" size={18} color={theme.text} />
                  <Text style={[styles.socialBtnText, { color: theme.text }]}>{t('authx.apple')}</Text>
                </Pressable>
              )}
            </View>

            <Pressable onPress={() => router.push('/auth/register')} style={styles.signupLink}>
              <Text style={[styles.signupLinkText, { color: theme.textMuted }]}>
                {t('authx.noAccount')}{' '}
                <Text style={{ fontFamily: 'Rubik_600SemiBold', color: Colors.primary }}>{t('authx.signUp')}</Text>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Rubik_600SemiBold' },
  scroll: { paddingHorizontal: 24, paddingTop: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  nafasLogo: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden' },
  welcomeText: { fontSize: 22, fontFamily: 'Rubik_700Bold' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  errorBannerText: { fontSize: 13, fontFamily: 'Rubik_400Regular', color: '#FF4444', flex: 1 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  forgotText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14,
    borderWidth: 1, paddingHorizontal: 14, height: 52, gap: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: 'Rubik_400Regular' },
  loginBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  loginBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  loginBtnText: { fontSize: 16, fontFamily: 'Rubik_600SemiBold', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1,
  },
  googleDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' },
  googleDotText: { fontSize: 11, fontFamily: 'Rubik_700Bold', color: '#fff' },
  socialBtnText: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  signupLink: { alignItems: 'center', paddingVertical: 20 },
  signupLinkText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
});
