import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';

// Persistent nudge shown while the athlete hasn't completed their profile.
// Tapping goes to the profile-completion flow. Renders nothing once complete.
export function CompleteProfileBanner() {
  const { t } = useTranslation();
  const { user, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  if (!user || user.profileComplete) return null;

  return (
    <Pressable onPress={() => router.push('/onboarding' as any)} style={[styles.banner, { backgroundColor: Colors.primary + '18', borderColor: Colors.primary + '40' }]}>
      <View style={[styles.icon, { backgroundColor: Colors.primary + '25' }]}>
        <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.complete_title')}</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>{t('onboarding.complete_sub')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 1 },
});
