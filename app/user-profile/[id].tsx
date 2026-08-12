import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/typography';
import { Display, StatTile, SectionHeader, Button, EmptyState } from '@/components/ui';
import { users, posts, ranks } from '@/lib/mock-data';

const profileTabs = ['Posts', 'Workouts', 'Achievements'];

const achievementIcons: Record<string, { icon: string; color: string }> = {
  'First Workout': { icon: 'medal-outline', color: '#4ECDC4' },
  '10 Day Streak': { icon: 'flame-outline', color: '#FF6B35' },
  '21 Day Streak': { icon: 'flame-outline', color: '#FF6B35' },
  '30 Day Streak': { icon: 'flame-outline', color: '#FFD700' },
  '100kg Bench': { icon: 'barbell-outline', color: '#00B4D8' },
  '200kg Deadlift': { icon: 'barbell-outline', color: '#FF6B35' },
  'Community Leader': { icon: 'people-outline', color: '#9B59B6' },
  'Half Marathon': { icon: 'walk-outline', color: '#4ECDC4' },
  'Social Butterfly': { icon: 'chatbubbles-outline', color: '#FF8FA3' },
  'Elite Status': { icon: 'diamond-outline', color: '#00B4D8' },
  'Tournament Winner': { icon: 'trophy', color: '#FFD700' },
  'Handstand Hold': { icon: 'body-outline', color: '#FF6B35' },
};

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, likedPosts, toggleLike } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState('Posts');
  const [isFollowing, setIsFollowing] = useState(false);

  const profileUser = users.find(u => u.id === id);
  const userPosts = posts.filter(p => p.userId === id);
  const userRank = ranks.find(r => r.id === profileUser?.rank);

  if (!profileUser) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8, borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState icon="person-outline" title="User not found" />
        </View>
      </View>
    );
  }

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const timeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const handleFollow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsFollowing(prev => !prev);
  };

  const recentWorkouts = [
    { id: 'rw1', type: 'Push Day', duration: 58, date: '2 days ago', exercises: 5 },
    { id: 'rw2', type: 'Pull Day', duration: 65, date: '4 days ago', exercises: 6 },
    { id: 'rw3', type: 'Leg Day', duration: 52, date: '6 days ago', exercises: 4 },
  ];

  const renderPostsTab = () => (
    <View>
      {userPosts.length === 0 ? (
        <EmptyState icon="document-text-outline" title="No posts yet" />
      ) : (
        userPosts.map((post, index) => {
          const isLiked = likedPosts.has(post.id);
          return (
            <Animated.View
              key={post.id}
              entering={FadeInDown.delay(index * 80).duration(400)}
              style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.postContent, { color: theme.text }]}>{post.content}</Text>
              <View style={[styles.postFooter, { borderTopColor: theme.border }]}>
                <View style={styles.postActions}>
                  <Pressable
                    style={styles.postAction}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleLike(post.id);
                    }}
                  >
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isLiked ? Colors.semantic.danger : theme.textSecondary}
                    />
                    <Text style={[styles.postActionText, { color: theme.textSecondary }]}>
                      {post.likes + (isLiked && !post.liked ? 1 : !isLiked && post.liked ? -1 : 0)}
                    </Text>
                  </Pressable>
                  <View style={styles.postAction}>
                    <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} />
                    <Text style={[styles.postActionText, { color: theme.textSecondary }]}>
                      {post.comments.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.postTime, { color: theme.textMuted }]}>{timeAgo(post.timestamp)}</Text>
              </View>
            </Animated.View>
          );
        })
      )}
    </View>
  );

  const renderWorkoutsTab = () => (
    <View>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.statRow}>
        <StatTile value={String(profileUser.totalWorkouts)} label="Workouts" />
        <StatTile value={formatVolume(profileUser.totalVolume)} label="Total Volume" color={Colors.ring.amber} />
        <StatTile value={String(profileUser.bestStreak)} label="Best Streak" color={Colors.ring.blue} />
      </Animated.View>

      <SectionHeader title="Recent Workouts" style={styles.sectionHeader} />
      {recentWorkouts.map((workout, index) => (
        <Animated.View
          key={workout.id}
          entering={FadeInDown.delay(index * 80 + 100).duration(400)}
          style={[styles.workoutItem, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={[styles.workoutIcon, { backgroundColor: Colors.electric + '18' }]}>
            <Ionicons name="barbell-outline" size={20} color={Colors.electric} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.workoutType, { color: theme.text }]}>{workout.type}</Text>
            <Text style={[styles.workoutMeta, { color: theme.textSecondary }]}>
              {workout.exercises} exercises · {workout.duration} min
            </Text>
          </View>
          <Text style={[styles.workoutDate, { color: theme.textMuted }]}>{workout.date}</Text>
        </Animated.View>
      ))}
    </View>
  );

  const renderAchievementsTab = () => (
    <View style={styles.achievementsGrid}>
      {profileUser.achievements.map((achievement, index) => {
        const info = achievementIcons[achievement] || { icon: 'star-outline', color: '#FFD700' };
        return (
          <Animated.View
            key={achievement}
            entering={FadeInDown.delay(index * 80).duration(400)}
            style={[styles.achievementCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.achievementIconWrap, { backgroundColor: `${info.color}18` }]}>
              <Ionicons name={info.icon as any} size={28} color={info.color} />
            </View>
            <Text style={[styles.achievementName, { color: theme.text }]} numberOfLines={2}>
              {achievement}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8,
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          @{profileUser.username}
        </Text>
        <Pressable style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.profileSection}>
          <View style={[styles.avatarRing, { borderColor: Colors.electric }]}>
            {profileUser.avatar ? (
              <Image source={{ uri: profileUser.avatar }} style={styles.avatarImg} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={['#1A3A30', '#0C201A']} style={styles.avatarImg}>
                <Text style={styles.avatarInitial}>{profileUser.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>

          <Display variant="d2" color={theme.text} style={styles.profileName}>{profileUser.name}</Display>
          <Text style={[styles.profileUsername, { color: theme.textSecondary }]}>
            @{profileUser.username}
          </Text>

          <View style={styles.badgeRow}>
            {!!profileUser.type && (
              <View style={[styles.typeBadge, { backgroundColor: Colors.electric + '18' }]}>
                <Ionicons name="fitness-outline" size={13} color={Colors.electric} />
                <Text style={[styles.typeBadgeText, { color: Colors.electric }]}>{profileUser.type}</Text>
              </View>
            )}
            {userRank ? (
              <View style={[styles.rankBadge, { backgroundColor: `${userRank.color}20` }]}>
                <Ionicons name={userRank.icon as any} size={13} color={userRank.color} />
                <Text style={[styles.rankText, { color: userRank.color }]}>{userRank.name}</Text>
              </View>
            ) : null}
          </View>

          {profileUser.bio ? (
            <Text style={[styles.profileBio, { color: theme.textSecondary }]}>
              {profileUser.bio}
            </Text>
          ) : null}

          <View style={styles.statRow}>
            <StatTile value={String(profileUser.totalWorkouts)} label="Workouts" />
            <StatTile value={formatNumber(profileUser.followers)} label="Followers" color={Colors.ring.blue} />
            <StatTile value={formatNumber(profileUser.following)} label="Following" color={Colors.ring.amber} />
          </View>

          <View style={styles.actionRow}>
            <Button
              variant={isFollowing ? 'ghost' : 'solid'}
              icon={isFollowing ? 'checkmark' : 'person-add-outline'}
              label={isFollowing ? 'Following' : 'Follow'}
              onPress={handleFollow}
              style={styles.actionBtn}
            />
            <Button
              variant="ghost"
              icon="chatbubble-outline"
              label="Message"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={styles.actionBtn}
            />
          </View>
        </Animated.View>

        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          {profileTabs.map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: Colors.electric },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? Colors.electric : theme.textMuted },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'Posts' && renderPostsTab()}
          {activeTab === 'Workouts' && renderWorkoutsTab()}
          {activeTab === 'Achievements' && renderAchievementsTab()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    flex: 1,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    padding: 3,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
  profileName: {
    marginTop: 14,
    textAlign: 'center',
  },
  profileUsername: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    gap: 5,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    textTransform: 'capitalize',
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    gap: 5,
  },
  rankText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionHeader: {
    marginTop: 24,
  },
  postCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  postContent: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    lineHeight: 21,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postActionText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  postTime: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  workoutMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  workoutDate: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '47%',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },
  achievementIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementName: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    textAlign: 'center',
  },
});
