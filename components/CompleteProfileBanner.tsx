import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Button } from '@/components/ui';

// Persistent nudge shown while the athlete hasn't completed their profile.
// Tapping goes to the profile-completion flow. Renders nothing once complete.
export function CompleteProfileBanner() {
  const { t } = useTranslation();
  const { user, isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  if (!user || user.profileComplete) return null;

  return (
    <Pressable onPress={() => router.push('/onboarding' as any)} style={[styles.banner, { backgroundColor: Colors.electric + '14', borderColor: Colors.electric + '40' }]}>
      <View style={[styles.icon, { backgroundColor: Colors.electric + '22' }]}>
        <Ionicons name="person-add-outline" size={18} color={Colors.electric} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.complete_title')}</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>{t('onboarding.complete_sub')}</Text>
      </View>
      <Button variant="icon" icon="chevron-forward" onPress={() => router.push('/onboarding' as any)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: Fonts.semibold },
  sub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
});
