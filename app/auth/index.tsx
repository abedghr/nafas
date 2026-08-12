import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, Button } from '@/components/ui';

const NAFAS_LOGO = require('../../assets/images/icon.png');

export default function AuthWelcome() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Social OAuth not wired yet — route to email signup for now.
  const handleGoogle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth/register');
  };

  const handleApple = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/auth/register');
  };

  const handleEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/register');
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Branded gradient hero backdrop */}
      <LinearGradient
        colors={['#12332A', '#0B1F18', '#07070B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[Colors.electric + '2E', 'transparent']}
        style={styles.topGradient}
      />
      <LinearGradient
        colors={['transparent', '#07070Bcc', '#07070B']}
        style={styles.bottomGradient}
      />

      <View style={[styles.hero, { paddingTop: Platform.OS === 'web' ? 100 : insets.top + 60 }]}>
        <Animated.View entering={FadeInDown.duration(700).delay(100)} style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image source={NAFAS_LOGO} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.logoText}>نَفَس</Text>
          <Display variant="d1" color="#fff" style={styles.wordmark}>NAFAS</Display>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(700).delay(300)} style={styles.taglineContainer}>
          <Text style={styles.tagline}>{t('authx.tagline')}</Text>
          <Text style={styles.taglineAr}>رفيقك الذكي للياقة البدنية</Text>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.duration(700).delay(400)}
        style={[styles.actions, { paddingBottom: Platform.OS === 'web' ? 40 : insets.bottom + 24 }]}
      >
        <Pressable
          onPress={handleGoogle}
          style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons name="logo-google" size={18} color="#fff" />
          <Text style={styles.socialBtnText}>{t('authx.continueWithGoogle')}</Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            style={({ pressed }) => [styles.socialBtn, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Ionicons name="logo-apple" size={20} color="#fff" />
            <Text style={styles.socialBtnText}>{t('authx.continueWithApple')}</Text>
          </Pressable>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('authx.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          variant="primary"
          label={t('authx.signUpWithEmail')}
          onPress={handleEmail}
          playIcon="arrow-forward"
        />

        <Pressable onPress={handleLogin} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            {t('authx.alreadyMember')}{' '}
            <Text style={styles.loginLinkBold}>{t('authx.logIn')}</Text>
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07070B',
    justifyContent: 'space-between',
  },
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 420,
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 360,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: Colors.electric,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  logoText: {
    fontSize: 40,
    fontFamily: Fonts.bold,
    color: '#fff',
    letterSpacing: 2,
  },
  wordmark: {
    marginTop: 2,
  },
  taglineContainer: {
    alignItems: 'center',
    gap: 6,
  },
  tagline: {
    fontSize: 18,
    fontFamily: Fonts.regular,
    color: '#FFFFFFAA',
    textAlign: 'center',
  },
  taglineAr: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: '#FFFFFF66',
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  socialBtnText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#FFFFFF66',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: '#FFFFFF80',
  },
  loginLinkBold: {
    fontFamily: Fonts.semibold,
    color: Colors.electric,
  },
});
