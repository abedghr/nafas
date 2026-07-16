import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { ranks, sportInterests } from '@/lib/mock-data';
import { gymsApi } from '@/src/features/gyms/api';
import { eventsApi } from '@/src/features/events/api';
import { CompleteProfileBanner } from '@/components/CompleteProfileBanner';

function ProfileStat({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.profileStat}>
      <Text style={[styles.profileStatValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.profileStatLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

function PhysStat({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.physStat}>
      <Text style={[styles.physValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.physLabel, { color: theme.textMuted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function SettingsItem({ icon, label, right, onPress, isDark }: any) {
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsItem,
        { backgroundColor: theme.card, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.settingsIconBg, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={[styles.settingsLabel, { color: theme.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {right || <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, isDark, toggleTheme, language, setLanguage, workouts, streak, logout, deleteAccount } = useApp();
  const [ownsGyms, setOwnsGyms] = useState(false);
  const [managesGyms, setManagesGyms] = useState(false);
  const [organizesEvents, setOrganizesEvents] = useState(false);
  useEffect(() => {
    gymsApi.ownedGyms().then(g => setOwnsGyms(g.length > 0)).catch(() => {});
    gymsApi.managed().then(g => setManagesGyms(g.length > 0)).catch(() => {});
    eventsApi.owned().then(e => setOrganizesEvents(e.length > 0)).catch(() => {});
  }, []);
  const theme = isDark ? Colors.dark : Colors.light;

  const currentRank = ranks.find(r => {
    const nextRank = ranks.find(nr => nr.minWorkouts > r.minWorkouts);
    return workouts.length >= r.minWorkouts && (!nextRank || workouts.length < nextRank.minWorkouts);
  }) || ranks[0];

  const totalVolume = workouts.reduce((acc, w) => acc + w.totalVolume, 0);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/auth');
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('profile.delete_account'),
      t('profile.delete_account_confirm'),
      [
        { text: t('workoutSession.cancel'), style: 'cancel' },
        {
          text: t('profile.delete_account'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/auth');
            } catch (e: any) {
              Alert.alert(t('profile.delete_account'), e?.message || t('discover.save_failed'));
            }
          },
        },
      ],
    );
  };

  const isCoach = user?.type === 'coach';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={[Colors.primary + '30', 'transparent']}
          style={[styles.headerGradient, { paddingTop: Platform.OS === 'web' ? 67 + 24 : insets.top + 24 }]}
        >
          <View style={styles.profileHeader}>
            <View style={[styles.avatarLarge, { backgroundColor: theme.card, borderColor: Colors.primary }]}>
              <Text style={[styles.avatarLargeText, { color: Colors.primary }]}>
                {user?.name?.charAt(0) || 'N'}
              </Text>
            </View>
            <Text style={[styles.profileName, { color: theme.text }]}>{user?.name || 'Nafas User'}</Text>
            <Text style={[styles.profileUsername, { color: theme.textSecondary }]}>@{user?.username || 'nafas_user'}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: (isCoach ? Colors.accent : Colors.primary) + '20' }]}>
                <Ionicons name={isCoach ? 'ribbon' : 'barbell'} size={13} color={isCoach ? Colors.accent : Colors.primary} />
                <Text style={[styles.typeText, { color: isCoach ? Colors.accent : Colors.primary }]}>
                  {isCoach ? t('profile.coach') : t('profile.athlete')}
                </Text>
              </View>
              <View style={[styles.rankBadge, { backgroundColor: currentRank.color + '20' }]}>
                <Ionicons name={currentRank.icon as any} size={14} color={currentRank.color} />
                <Text style={[styles.rankText, { color: currentRank.color }]}>{currentRank.name}</Text>
              </View>
            </View>

            {!!user?.bio && (
              <Text style={[styles.profileBio, { color: theme.textSecondary }]}>{user.bio}</Text>
            )}
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <ProfileStat label={t('profile.total_workouts')} value={workouts.length.toString()} isDark={isDark} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <ProfileStat label={t('profile.total_volume')} value={totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}K` : '0'} isDark={isDark} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <ProfileStat label={t('profile.best_streak')} value={`${streak} ${t('coach.days')}`} isDark={isDark} />
        </View>

        <CompleteProfileBanner />

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <View style={styles.physSection}>
            <View style={styles.physHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>{t('discover.my_profile')}</Text>
              <Pressable onPress={() => router.push('/edit-profile' as any)} style={styles.editLink}>
                <Ionicons name="create-outline" size={15} color={Colors.primary} />
                <Text style={[styles.editLinkText, { color: Colors.primary }]}>{t('discover.edit_profile')}</Text>
              </Pressable>
            </View>
            <View style={styles.physRow}>
              <PhysStat label={t('onboarding.height')} value={user?.height ? `${user.height} cm` : '—'} theme={theme} />
              <PhysStat label={t('onboarding.weight')} value={user?.weight ? `${user.weight} kg` : '—'} theme={theme} />
              <PhysStat label={t('onboarding.age')} value={user?.age ? String(user.age) : '—'} theme={theme} />
              <PhysStat label={t('onboarding.goals')} value={user?.goal ? t(`onboarding.${user.goal}`) : '—'} theme={theme} />
            </View>
          </View>
        </Animated.View>

        {user?.interests && user.interests.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View style={styles.interestsSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('onboarding.interests')}</Text>
              <View style={styles.interestTags}>
                {user.interests.map(interest => {
                  const sport = sportInterests.find(s => s.id === interest);
                  const sportColor = (Colors.sport as any)[interest] || Colors.primary;
                  return (
                    <View key={interest} style={[styles.interestTag, { backgroundColor: sportColor + '15' }]}>
                      <Ionicons name={(sport?.icon || 'fitness-outline') as any} size={14} color={sportColor} />
                      <Text style={[styles.interestTagText, { color: sportColor }]}>{sport?.name || interest}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}

        {user?.type === 'coach' && (
          <Animated.View entering={FadeInDown.duration(400).delay(150)}>
            <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: 20 }]}>{t('discover.my_coaching')}</Text>
            <View style={styles.settingsGroup}>
              <SettingsItem icon="clipboard-outline" label={t('discover.manage_plans')} isDark={isDark} onPress={() => router.push('/coaching' as any)} />
              <SettingsItem icon="people-outline" label={t('discover.leads')} isDark={isDark} onPress={() => router.push('/coaching' as any)} />
            </View>
          </Animated.View>
        )}

        {(managesGyms || organizesEvents) && (
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: 20 }]}>{t('discover.gym_owner')}</Text>
            <View style={styles.settingsGroup}>
              {ownsGyms && <SettingsItem icon="people-outline" label={t('discover.gym_leads')} isDark={isDark} onPress={() => router.push('/gym-leads' as any)} />}
              {managesGyms && <SettingsItem icon="business-outline" label={t('discover.manage_gym')} isDark={isDark} onPress={() => router.push('/manage-gym' as any)} />}
              {organizesEvents && <SettingsItem icon="trophy-outline" label={t('discover.manage_events')} isDark={isDark} onPress={() => router.push('/manage-events' as any)} />}
              {organizesEvents && <SettingsItem icon="people-outline" label={t('discover.event_registrants')} isDark={isDark} onPress={() => router.push('/event-registrants' as any)} />}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: 20 }]}>{t('profile.settings')}</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="moon-outline"
              label={t('profile.dark_mode')}
              isDark={isDark}
              onPress={toggleTheme}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#767577', true: Colors.primary + '60' }}
                  thumbColor={isDark ? Colors.primary : '#f4f3f4'}
                />
              }
            />
            <SettingsItem
              icon="language-outline"
              label={t('profile.language')}
              isDark={isDark}
              onPress={toggleLanguage}
              right={
                <View style={[styles.langBadge, { backgroundColor: Colors.primary + '15' }]}>
                  <Text style={[styles.langText, { color: Colors.primary }]}>
                    {language === 'en' ? 'EN' : 'AR'}
                  </Text>
                </View>
              }
            />
            <SettingsItem icon="person-outline" label={t('profile.edit')} isDark={isDark} onPress={() => router.push('/edit-profile' as any)} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Pressable
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: '#FF4458' + '15' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4458" />
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </Pressable>
          <Pressable onPress={handleDeleteAccount} style={styles.deleteAccountBtn}>
            <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
            <Text style={[styles.deleteAccountText, { color: theme.textMuted }]}>{t('profile.delete_account')}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 24 },
  profileHeader: { alignItems: 'center', gap: 8 },
  avatarLarge: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
  },
  avatarLargeText: { fontSize: 36, fontFamily: 'Rubik_700Bold' },
  profileName: { fontSize: 22, fontFamily: 'Rubik_700Bold' },
  profileUsername: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 12,
  },
  typeText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  profileBio: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center', marginTop: 10, paddingHorizontal: 32, lineHeight: 18 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 12,
  },
  rankText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, paddingHorizontal: 20,
  },
  profileStat: { flex: 1, alignItems: 'center', gap: 4 },
  profileStatValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  profileStatLabel: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  statDivider: { width: 1, height: 36 },
  interestsSection: { paddingHorizontal: 20, marginBottom: 8 },
  physSection: { paddingHorizontal: 20, marginBottom: 8 },
  physHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  editLinkText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  physRow: { flexDirection: 'row', gap: 8 },
  physStat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(128,128,128,0.08)' },
  physValue: { fontSize: 15, fontFamily: 'Rubik_700Bold' },
  physLabel: { fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', marginBottom: 12 },
  interestTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 12,
  },
  interestTagText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  settingsGroup: { paddingHorizontal: 20, gap: 8 },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12,
  },
  settingsIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  langBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  langText: { fontSize: 13, fontFamily: 'Rubik_700Bold' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 24, padding: 16, borderRadius: 14,
  },
  logoutText: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', color: '#FF4458' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 10,
  },
  deleteAccountText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
});
