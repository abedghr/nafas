import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
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
import { confirmDialog, alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { Display } from '@/components/ui';
import { Type } from '@/constants/typography';
import { ranks, sportInterests } from '@/lib/mock-data';
import { toDisplayWeight, unitLabel, type WeightUnit } from '@/lib/units';
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

// Inset grouped-list row (standard settings pattern): tinted icon + label + trailing
// value/chevron/control, with a hairline divider between rows inside a group card.
function SettingsItem({ icon, label, right, onPress, isDark, destructive, last }: any) {
  const theme = isDark ? Colors.dark : Colors.light;
  const tint = destructive ? Colors.semantic.danger : Colors.electric;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsItem, { backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}
    >
      <View style={[styles.settingsIconBg, { backgroundColor: tint + '15' }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <Text style={[styles.settingsLabel, { color: destructive ? Colors.semantic.danger : theme.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {right || (!destructive && <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />)}
      {!last && <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, isDark, toggleTheme, language, setLanguage, weightUnit, setWeightUnit, workouts, streak, logout, deleteAccount } = useApp();
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

  const handleDeleteAccount = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (await confirmDialog({ title: t('profile.delete_account'), message: t('profile.delete_account_confirm'), destructive: true, confirmText: t('profile.delete_account'), cancelText: t('workoutSession.cancel') })) {
      try {
        await deleteAccount();
        router.replace('/auth');
      } catch (e: any) {
        await alertDialog(t('profile.delete_account'), e?.message || t('discover.save_failed'));
      }
    }
  };

  const isCoach = user?.type === 'coach';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <LinearGradient
          colors={[Colors.electric + '30', 'transparent']}
          style={[styles.headerGradient, { paddingTop: Platform.OS === 'web' ? 67 + 24 : insets.top + 24 }]}
        >
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings' as any); }}
            hitSlop={10}
            style={[styles.gearBtn, { top: (Platform.OS === 'web' ? 67 : insets.top) + 8, backgroundColor: theme.card + 'cc', borderColor: theme.border }]}
          >
            <Ionicons name="settings-outline" size={19} color={theme.text} />
          </Pressable>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarLarge, { backgroundColor: theme.card, borderColor: Colors.electric }]}>
              <Text style={[styles.avatarLargeText, { color: Colors.electric }]}>
                {user?.name?.charAt(0) || 'N'}
              </Text>
            </View>
            <Display variant="d2" color={theme.text} style={{ marginTop: 4 }}>{user?.name || 'Nafas User'}</Display>
            <Text style={[styles.profileUsername, { color: theme.textSecondary }]}>@{user?.username || 'nafas_user'}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: (isCoach ? Colors.accent : Colors.electric) + '20' }]}>
                <Ionicons name={isCoach ? 'ribbon' : 'barbell'} size={13} color={isCoach ? Colors.accent : Colors.electric} />
                <Text style={[styles.typeText, { color: isCoach ? Colors.accent : Colors.electric }]}>
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
                <Ionicons name="create-outline" size={15} color={Colors.electric} />
                <Text style={[styles.editLinkText, { color: Colors.electric }]}>{t('discover.edit_profile')}</Text>
              </Pressable>
            </View>
            <View style={styles.physRow}>
              <PhysStat label={t('onboarding.height')} value={user?.height ? `${user.height} cm` : '—'} theme={theme} />
              <PhysStat label={t('onboarding.weight')} value={user?.weight ? `${toDisplayWeight(user.weight, weightUnit)} ${unitLabel(weightUnit)}` : '—'} theme={theme} />
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
                  const sportColor = Colors.electric;
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
            <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <SettingsItem icon="clipboard-outline" label={t('discover.manage_plans')} isDark={isDark} onPress={() => router.push('/coaching' as any)} />
              <SettingsItem icon="people-outline" label={t('discover.leads')} isDark={isDark} onPress={() => router.push('/coaching' as any)} />
            </View>
          </Animated.View>
        )}

        {(managesGyms || organizesEvents) && (
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <Text style={[styles.sectionTitle, { color: theme.text, paddingHorizontal: 20 }]}>{t('discover.gym_owner')}</Text>
            <View style={[styles.settingsGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {ownsGyms && <SettingsItem icon="people-outline" label={t('discover.gym_leads')} isDark={isDark} onPress={() => router.push('/gym-leads' as any)} />}
              {managesGyms && <SettingsItem icon="business-outline" label={t('discover.manage_gym')} isDark={isDark} onPress={() => router.push('/manage-gym' as any)} />}
              {organizesEvents && <SettingsItem icon="trophy-outline" label={t('discover.manage_events')} isDark={isDark} onPress={() => router.push('/manage-events' as any)} />}
              {organizesEvents && <SettingsItem icon="people-outline" label={t('discover.event_registrants')} isDark={isDark} onPress={() => router.push('/event-registrants' as any)} />}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings' as any); }}
            style={({ pressed }) => [styles.settingsGroup, styles.settingsEntry, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={[styles.settingsIconBg, { backgroundColor: Colors.electric + '15' }]}>
              <Ionicons name="settings-outline" size={17} color={Colors.electric} />
            </View>
            <Text style={[styles.settingsLabel, { color: theme.text }]}>{t('profile.settings')}</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 20 },
  profileHeader: { alignItems: 'center', gap: 6 },
  avatarLarge: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarLargeText: { fontSize: 30, fontFamily: 'Rubik_700Bold' },
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
  sectionTitle: { fontSize: 12, fontFamily: 'Rubik_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  interestTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 12,
  },
  interestTagText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  // inset grouped-list (standard settings pattern)
  settingsGroup: { marginHorizontal: 20, marginBottom: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  settingsEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 15, marginTop: 4 },
  gearBtn: { position: 'absolute', right: 20, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, minHeight: 56,
  },
  settingsIconBg: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  rowDivider: { position: 'absolute', left: 58, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  rowValueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowValue: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  themeTrack: { width: 48, height: 28, borderRadius: 14, padding: 2, flexDirection: 'row', alignItems: 'center' },
  themeKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  unitChipRow: { flexDirection: 'row', gap: 4, backgroundColor: 'transparent' },
  unitChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  unitChipText: { fontSize: 12, fontFamily: 'Rubik_700Bold' },
});
