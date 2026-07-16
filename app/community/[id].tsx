import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
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

  const renderPost = (post: typeof posts[0]) => {
    const user = users.find(u => u.id === post.userId);
    const isLiked = likedPosts.has(post.id);
    return (
      <View style={[styles.postCard, { backgroundColor: theme.card }]}>
        <View style={styles.postHeader}>
          <View style={[styles.postAvatar, { backgroundColor: theme.cardAlt }]}>
            <Text style={[styles.postAvatarText, { color: Colors.primary }]}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.postName, { color: theme.text }]}>{user?.name}</Text>
          </View>
        </View>
        <Text style={[styles.postContent, { color: theme.text }]}>{post.content}</Text>
        <View style={[styles.postActions, { borderTopColor: theme.border }]}>
          <Pressable onPress={() => { toggleLike(post.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.postAction}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? '#FF4458' : theme.textMuted} />
            <Text style={[styles.actionText, { color: isLiked ? '#FF4458' : theme.textMuted }]}>{post.likes}</Text>
          </Pressable>
          <Pressable style={styles.postAction}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>{Array.isArray(post.comments) ? post.comments.length : post.comments}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCoach = (coach: typeof coaches[0], index: number) => (
    <Animated.View key={coach.id} entering={FadeInDown.duration(300).delay(index * 80)}>
      <View style={[styles.coachCard, { backgroundColor: theme.card }]}>
        <View style={[styles.coachAvatar, { backgroundColor: theme.cardAlt }]}>
          <Text style={[styles.coachAvatarText, { color: Colors.primary }]}>{coach.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.coachName, { color: theme.text }]}>{coach.name}</Text>
          <Text style={[styles.coachBio, { color: theme.textMuted }]} numberOfLines={1}>{coach.bio}</Text>
          <View style={styles.coachMeta}>
            <View style={styles.coachRating}>
              <Ionicons name="star" size={14} color="#FFD93D" />
              <Text style={[styles.coachRatingText, { color: theme.text }]}>{coach.rating}</Text>
            </View>
            <Text style={[styles.coachPrice, { color: Colors.primary }]}>{coach.pricePerSession} {coach.currency}/session</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderTournament = (tournament: typeof tournaments[0], index: number) => (
    <Animated.View key={tournament.id} entering={FadeInDown.duration(300).delay(index * 80)}>
      <View style={[styles.tournamentCard, { backgroundColor: theme.card }]}>
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
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.headerIcon, { backgroundColor: sportColor + '20' }]}>
            <Ionicons name={(community?.icon || 'globe-outline') as any} size={20} color={sportColor} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{community?.name || 'Community'}</Text>
        </View>
        <Pressable>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={{ flexGrow: 0 }}
      >
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => { setActiveTab(tab.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.tabBtn,
              { backgroundColor: activeTab === tab.id ? sportColor : theme.card },
            ]}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? '#fff' : theme.textSecondary} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.id ? '#fff' : theme.textSecondary }]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'feed' && communityPosts.map(p => (
          <View key={p.id}>{renderPost(p)}</View>
        ))}
        {activeTab === 'feed' && communityPosts.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No posts yet</Text>
          </View>
        )}
        {activeTab === 'trending' && (
          <View style={styles.trendingSection}>
            <View style={[styles.trendCard, { backgroundColor: theme.card }]}>
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
            <View style={[styles.trendCard, { backgroundColor: theme.card }]}>
              <View style={[styles.trendIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="flash" size={24} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trendTitle, { color: theme.text }]}>100 Push-ups Daily</Text>
                <Text style={[styles.trendSub, { color: theme.textMuted }]}>234 participants</Text>
              </View>
              <View style={[styles.trendBadge, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={[styles.trendBadgeText, { color: Colors.primary }]}>Hot</Text>
              </View>
            </View>
          </View>
        )}
        {activeTab === 'coaches' && communityCoaches.map((c, i) => renderCoach(c, i))}
        {activeTab === 'coaches' && communityCoaches.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No coaches in this community yet</Text>
          </View>
        )}
        {activeTab === 'tournaments' && communityTournaments.map((t, i) => renderTournament(t, i))}
        {activeTab === 'tournaments' && communityTournaments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No tournaments scheduled</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Rubik_600SemiBold' },
  tabsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 12,
  },
  tabLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  postCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  postName: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  postContent: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 21, marginBottom: 10 },
  postActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, paddingTop: 10 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  trendingSection: { paddingHorizontal: 20, gap: 12 },
  trendCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 14 },
  trendIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  trendTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  trendSub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  trendBadgeText: { fontSize: 12, fontFamily: 'Rubik_700Bold' },
  coachCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 14, marginBottom: 12 },
  coachAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  coachAvatarText: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  coachName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  coachBio: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  coachMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  coachRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coachRatingText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  coachPrice: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  tournamentCard: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 14, marginBottom: 12 },
  tournamentIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tournamentName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 6 },
  tournamentMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  tournamentDate: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  tournamentLevels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  registeredCount: { alignItems: 'center' },
  registeredValue: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  registeredLabel: { fontSize: 10, fontFamily: 'Rubik_400Regular' },
});
