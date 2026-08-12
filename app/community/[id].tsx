import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, Chip, Button, EmptyState } from '@/components/ui';
import { communities, posts, users, coaches, tournaments } from '@/lib/mock-data';

const tabs = [
  { id: 'feed', icon: 'newspaper-outline', label: 'Feed' },
  { id: 'trending', icon: 'trending-up-outline', label: 'Trending' },
  { id: 'coaches', icon: 'school-outline', label: 'Coaches' },
  { id: 'tournaments', icon: 'trophy-outline', label: 'Tournaments' },
];

export default function CommunityDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, likedPosts, toggleLike } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState('feed');

  const community = communities.find(c => c.id === id);
  const sportColor = (Colors.sport as any)[id || ''] || Colors.primary;
  const communityPosts = id === 'all' ? posts : posts.filter(p => p.community === id);
  const communityCoaches = coaches.filter(c => c.specialization.includes(id || ''));
  const communityTournaments = tournaments.filter(t => t.sport === id);

  const renderPost = (post: typeof posts[0], index: number) => {
    const user = users.find(u => u.id === post.userId);
    const isLiked = likedPosts.has(post.id);
    return (
      <Animated.View key={post.id} entering={FadeInDown.duration(300).delay(index * 60)}>
        <View style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.postHeader}>
            {user?.avatar ? (
              <ExpoImage source={{ uri: user.avatar }} style={styles.postAvatarImg} contentFit="cover" transition={200} />
            ) : (
              <View style={[styles.postAvatar, { backgroundColor: sportColor + '25' }]}>
                <Text style={[styles.postAvatarText, { color: sportColor }]}>{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.postName, { color: theme.text }]}>{user?.name}</Text>
            </View>
          </View>
          <Text style={[styles.postContent, { color: theme.text }]}>{post.content}</Text>
          <View style={[styles.postActions, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => { toggleLike(post.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.postAction, isLiked && { backgroundColor: Colors.electric + '18' }]}
            >
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={19} color={isLiked ? Colors.electric : theme.textMuted} />
              <Text style={[styles.actionText, { color: isLiked ? Colors.electric : theme.textMuted }]}>{post.likes}</Text>
            </Pressable>
            <Pressable style={styles.postAction}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
              <Text style={[styles.actionText, { color: theme.textMuted }]}>{Array.isArray(post.comments) ? post.comments.length : post.comments}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderCoach = (coach: typeof coaches[0], index: number) => (
    <Animated.View key={coach.id} entering={FadeInDown.duration(300).delay(index * 80)}>
      <View style={[styles.coachCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {coach.avatar ? (
          <ExpoImage source={{ uri: coach.avatar }} style={styles.coachAvatarImg} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.coachAvatar, { backgroundColor: theme.cardAlt }]}>
            <Text style={[styles.coachAvatarText, { color: Colors.electric }]}>{coach.name.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.coachName, { color: theme.text }]}>{coach.name}</Text>
          <Text style={[styles.coachBio, { color: theme.textMuted }]} numberOfLines={1}>{coach.bio}</Text>
          <View style={styles.coachMeta}>
            <View style={styles.coachRating}>
              <Ionicons name="star" size={14} color={Colors.semantic.warn} />
              <Text style={[styles.coachRatingText, { color: theme.text }]}>{coach.rating}</Text>
            </View>
            <Text style={[styles.coachPrice, { color: Colors.electric }]}>{coach.pricePerSession} {coach.currency}/session</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </View>
    </Animated.View>
  );

  const renderTournament = (tournament: typeof tournaments[0], index: number) => (
    <Animated.View key={tournament.id} entering={FadeInDown.duration(300).delay(index * 80)}>
      <View style={[styles.tournamentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.tournamentIcon, { backgroundColor: sportColor + '20' }]}>
          <Ionicons name="trophy-outline" size={24} color={sportColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tournamentName, { color: theme.text }]}>{tournament.name}</Text>
          <View style={styles.tournamentMeta}>
            <Ionicons name="calendar-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.tournamentDate, { color: theme.textMuted }]}>{tournament.date}</Text>
          </View>
          <View style={styles.tournamentMeta}>
            <Ionicons name="location-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.tournamentDate, { color: theme.textMuted }]}>{tournament.location}</Text>
          </View>
          <View style={styles.tournamentLevels}>
            {tournament.levels.map(level => (
              <View key={level} style={[styles.levelBadge, { backgroundColor: sportColor + '15' }]}>
                <Text style={[styles.levelText, { color: sportColor }]}>{level}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.registeredCount}>
          <Text style={[styles.registeredValue, { color: theme.text }]}>{tournament.registeredCount}</Text>
          <Text style={[styles.registeredLabel, { color: theme.textMuted }]}>joined</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 16 }]}>
        <Button variant="icon" icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: sportColor + '20' }]}>
            <Ionicons name={(community?.icon || 'globe-outline') as any} size={18} color={sportColor} />
          </View>
          <Display variant="d3" color={theme.text} numberOfLines={1}>{community?.name || 'Community'}</Display>
        </View>
        <Button variant="icon" icon="ellipsis-horizontal" onPress={() => {}} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={{ flexGrow: 0 }}
      >
        {tabs.map(tab => (
          <Chip
            key={tab.id}
            label={tab.label}
            icon={tab.icon as any}
            active={activeTab === tab.id}
            onPress={() => setActiveTab(tab.id)}
          />
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'feed' && communityPosts.map((p, i) => renderPost(p, i))}
        {activeTab === 'feed' && communityPosts.length === 0 && (
          <EmptyState icon="newspaper-outline" title="No posts yet" />
        )}
        {activeTab === 'trending' && (
          <View style={styles.trendingSection}>
            <Animated.View entering={FadeInDown.duration(300)}>
              <View style={[styles.trendCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.trendIcon, { backgroundColor: Colors.accent + '20' }]}>
                  <Ionicons name="flame" size={24} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trendTitle, { color: theme.text }]}>Handstand Challenge</Text>
                  <Text style={[styles.trendSub, { color: theme.textMuted }]}>Up 40% this week</Text>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: Colors.accent + '15' }]}>
                  <Text style={[styles.trendBadgeText, { color: Colors.accent }]}>+40%</Text>
                </View>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(300).delay(80)}>
              <View style={[styles.trendCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.trendIcon, { backgroundColor: Colors.electric + '20' }]}>
                  <Ionicons name="flash" size={24} color={Colors.electric} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trendTitle, { color: theme.text }]}>100 Push-ups Daily</Text>
                  <Text style={[styles.trendSub, { color: theme.textMuted }]}>234 participants</Text>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: Colors.electric + '15' }]}>
                  <Text style={[styles.trendBadgeText, { color: Colors.electric }]}>Hot</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        )}
        {activeTab === 'coaches' && communityCoaches.map((c, i) => renderCoach(c, i))}
        {activeTab === 'coaches' && communityCoaches.length === 0 && (
          <EmptyState icon="school-outline" title="No coaches in this community yet" />
        )}
        {activeTab === 'tournaments' && communityTournaments.map((t, i) => renderTournament(t, i))}
        {activeTab === 'tournaments' && communityTournaments.length === 0 && (
          <EmptyState icon="trophy-outline" title="No tournaments scheduled" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, gap: 12,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  postCard: { marginHorizontal: 20, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  postAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  postAvatarText: { fontSize: 16, fontFamily: Fonts.bold },
  postName: { ...Type.h2 },
  postContent: { ...Type.body, marginBottom: 10 },
  postActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10 },
  postAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999,
  },
  actionText: { fontSize: 13, fontFamily: Fonts.semibold },
  trendingSection: { paddingHorizontal: 20, gap: 12 },
  trendCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, gap: 14, borderWidth: 1 },
  trendIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trendTitle: { ...Type.h2 },
  trendSub: { ...Type.small, marginTop: 2 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  trendBadgeText: { fontSize: 12, fontFamily: Fonts.bold },
  coachCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 18, padding: 14, gap: 14, marginBottom: 12, borderWidth: 1 },
  coachAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  coachAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  coachAvatarText: { fontSize: 20, fontFamily: Fonts.bold },
  coachName: { ...Type.h2 },
  coachBio: { ...Type.small, marginTop: 2 },
  coachMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  coachRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coachRatingText: { fontSize: 13, fontFamily: Fonts.semibold },
  coachPrice: { fontSize: 12, fontFamily: Fonts.semibold },
  tournamentCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, borderRadius: 18, padding: 16, gap: 14, marginBottom: 12, borderWidth: 1 },
  tournamentIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tournamentName: { ...Type.h2, marginBottom: 6 },
  tournamentMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  tournamentDate: { ...Type.small },
  tournamentLevels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  levelText: { fontSize: 10, fontFamily: Fonts.semibold },
  registeredCount: { alignItems: 'center' },
  registeredValue: { ...Type.statSm },
  registeredLabel: { fontSize: 10, fontFamily: Fonts.medium },
});
