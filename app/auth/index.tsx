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
      <LinearGradient
        colors={['#00C89620', '#00C89608', 'transparent']}
        style={styles.topGradient}
      />
      <LinearGradient
        colors={['transparent', '#0A0A0F90', '#0A0A0F']}
        style={styles.bottomGradient}
      />

      <View style={[styles.hero, { paddingTop: Platform.OS === 'web' ? 100 : insets.top + 60 }]}>
        <Animated.View entering={FadeInDown.duration(700).delay(100)} style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image source={NAFAS_LOGO} style={styles.logoImage} resizeMode="cover" />
          </View>
          <Text style={styles.logoText}>نَفَس</Text>
          <Text style={styles.logoEn}>NAFAS</Text>
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
          style={({ pressed }) => [styles.socialBtn, styles.googleBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.socialBtnInner}>
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
            <Text style={styles.socialBtnText}>{t('authx.continueWithGoogle')}</Text>
          </View>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            onPress={handleApple}
            style={({ pressed }) => [styles.socialBtn, styles.appleBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={styles.socialBtnInner}>
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={[styles.socialBtnText, { color: '#fff' }]}>{t('authx.continueWithApple')}</Text>
            </View>
          </Pressable>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('authx.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [styles.emailBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emailBtnGradient}
          >
            <Ionicons name="mail-outline" size={20} color="#fff" />
            <Text style={styles.emailBtnText}>{t('authx.signUpWithEmail')}</Text>
          </LinearGradient>
        </Pressable>

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
    backgroundColor: '#0A0A0F',
    justifyContent: 'space-between',
  },
  topGradient: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 400,
  },
  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 350,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  logoText: {
    fontSize: 44,
    fontFamily: 'Rubik_700Bold',
    color: '#fff',
    letterSpacing: 2,
  },
  logoEn: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    color: Colors.primary,
    letterSpacing: 6,
  },
  taglineContainer: {
    alignItems: 'center',
    gap: 6,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Rubik_400Regular',
    color: '#FFFFFF99',
    textAlign: 'center',
  },
  taglineAr: {
    fontSize: 15,
    fontFamily: 'Rubik_400Regular',
    color: '#FFFFFF55',
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  socialBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333',
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 13,
    fontFamily: 'Rubik_700Bold',
    color: '#fff',
  },
  socialBtnText: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    color: '#111',
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
    backgroundColor: '#2A2A3E',
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    color: '#5C5C72',
  },
  emailBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emailBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  emailBtnText: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    color: '#fff',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    color: '#5C5C72',
  },
  loginLinkBold: {
    fontFamily: 'Rubik_600SemiBold',
    color: Colors.primary,
  },
});
