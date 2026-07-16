import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
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
        <View style={{ paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top }}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>User not found</Text>
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
        <View style={styles.emptyTab}>
          <Ionicons name="document-text-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyTabText, { color: theme.textSecondary }]}>No posts yet</Text>
        </View>
      ) : (
        userPosts.map((post, index) => {
          const isLiked = likedPosts.has(post.id);
          return (
            <Animated.View
              key={post.id}
              entering={FadeInDown.delay(index * 80).duration(400)}
              style={[styles.postCard, { backgroundColor: theme.card }]}
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
                      color={isLiked ? '#FF4B6E' : theme.textSecondary}
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
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.statsCard, { backgroundColor: theme.card }]}
      >
        <LinearGradient
          colors={['rgba(0,200,150,0.12)', 'rgba(0,200,150,0.02)']}
          style={styles.statsCardGradient}
        />
        <View style={styles.statsCardRow}>
          <View style={styles.statsCardItem}>
            <Text style={[styles.statsCardValue, { color: Colors.primary }]}>
              {profileUser.totalWorkouts}
            </Text>
            <Text style={[styles.statsCardLabel, { color: theme.textSecondary }]}>Workouts</Text>
          </View>
          <View style={[styles.statsCardDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statsCardItem}>
            <Text style={[styles.statsCardValue, { color: Colors.primary }]}>
              {formatVolume(profileUser.totalVolume)}
            </Text>
            <Text style={[styles.statsCardLabel, { color: theme.textSecondary }]}>Total Volume</Text>
          </View>
          <View style={[styles.statsCardDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statsCardItem}>
            <Text style={[styles.statsCardValue, { color: Colors.primary }]}>
              {profileUser.bestStreak}
            </Text>
            <Text style={[styles.statsCardLabel, { color: theme.textSecondary }]}>Best Streak</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Workouts</Text>
      {recentWorkouts.map((workout, index) => (
        <Animated.View
          key={workout.id}
          entering={FadeInDown.delay(index * 80 + 100).duration(400)}
          style={[styles.workoutItem, { backgroundColor: theme.card }]}
        >
          <View style={[styles.workoutIcon, { backgroundColor: `${Colors.primary}18` }]}>
            <Ionicons name="barbell-outline" size={20} color={Colors.primary} />
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
            style={[styles.achievementCard, { backgroundColor: theme.card }]}
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
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          @{profileUser.username}
        </Text>
        <Pressable style={styles.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.profileSection}>
          <View style={[styles.avatarCircle, { borderColor: Colors.primary }]}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarInitial}>
                {profileUser.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          <Text style={[styles.profileName, { color: theme.text }]}>{profileUser.name}</Text>
          <Text style={[styles.profileUsername, { color: theme.textSecondary }]}>
            @{profileUser.username}
          </Text>

          {profileUser.bio ? (
            <Text style={[styles.profileBio, { color: theme.textSecondary }]}>
              {profileUser.bio}
            </Text>
          ) : null}

          {userRank ? (
            <View style={[styles.rankBadge, { backgroundColor: `${userRank.color}20` }]}>
              <Ionicons name={userRank.icon as any} size={14} color={userRank.color} />
              <Text style={[styles.rankText, { color: userRank.color }]}>{userRank.name}</Text>
            </View>
          ) : null}

          <View style={[styles.statsRow, { borderColor: theme.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {profileUser.totalWorkouts}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Workouts</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatNumber(profileUser.followers)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Followers</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatNumber(profileUser.following)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Following</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.followBtn,
                isFollowing
                  ? { backgroundColor: 'transparent', borderColor: Colors.primary, borderWidth: 1.5 }
                  : { backgroundColor: Colors.primary },
              ]}
              onPress={handleFollow}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'person-add-outline'}
                size={16}
                color={isFollowing ? Colors.primary : '#fff'}
              />
              <Text
                style={[
                  styles.followBtnText,
                  { color: isFollowing ? Colors.primary : '#fff' },
                ]}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.messageBtn, { borderColor: theme.border }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Ionicons name="chatbubble-outline" size={16} color={theme.text} />
              <Text style={[styles.messageBtnText, { color: theme.text }]}>Message</Text>
            </Pressable>
          </View>
        </Animated.View>

        <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
          {profileTabs.map(tab => (
            <Pressable
              key={tab}
              style={[
                styles.tabItem,
                activeTab === tab && styles.tabItemActive,
                activeTab === tab && { borderBottomColor: Colors.primary },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? Colors.primary : theme.textMuted },
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
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Rubik_500Medium',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    padding: 2,
    overflow: 'hidden',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: 'Rubik_700Bold',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Rubik_700Bold',
    marginTop: 14,
  },
  profileUsername: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    marginTop: 2,
  },
  profileBio: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Rubik_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  followBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  messageBtnText: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  postCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
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
    fontFamily: 'Rubik_500Medium',
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTabText: {
    fontSize: 15,
    fontFamily: 'Rubik_500Medium',
  },
  statsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  statsCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  statsCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statsCardItem: {
    flex: 1,
    alignItems: 'center',
  },
  statsCardValue: {
    fontSize: 22,
    fontFamily: 'Rubik_700Bold',
  },
  statsCardLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    marginTop: 4,
  },
  statsCardDivider: {
    width: 1,
    height: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Rubik_600SemiBold',
    marginBottom: 12,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  workoutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
  },
  workoutMeta: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
    marginTop: 2,
  },
  workoutDate: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  achievementCard: {
    width: '47%',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  achievementIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementName: {
    fontSize: 13,
    fontFamily: 'Rubik_600SemiBold',
    textAlign: 'center',
  },
});
