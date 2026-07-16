import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { communities, posts, users } from '@/lib/mock-data';
import { isEnabled } from '@/lib/features';

function getInitials(name: string) {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function timeSince(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function WorkoutShareCard({ workoutData }: { workoutData: any }) {
  return (
    <LinearGradient
      colors={['#00C896', '#00A87A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.workoutCard}
    >
      <View style={styles.workoutHeader}>
        <View style={styles.workoutIconBg}>
          <Ionicons name="barbell" size={18} color="#00C896" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.workoutType}>{workoutData.type}</Text>
          <Text style={styles.workoutDuration}>{workoutData.duration} min</Text>
        </View>
        <Ionicons name="fitness" size={24} color="rgba(255,255,255,0.6)" />
      </View>
      <View style={styles.workoutDivider} />
      {workoutData.exercises.map((ex: any, i: number) => {
        const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight));
        return (
          <View key={i} style={styles.workoutExercise}>
            <Text style={styles.workoutExName}>{ex.name}</Text>
            <Text style={styles.workoutExSets}>
              {ex.sets.length} sets{maxWeight > 0 ? ` \u00B7 ${maxWeight}kg max` : ''}
            </Text>
          </View>
        );
      })}
      <View style={styles.workoutDivider} />
      <View style={styles.workoutFooter}>
        <Ionicons name="flame" size={16} color="rgba(255,255,255,0.9)" />
        <Text style={styles.workoutVolume}>
          Total Volume: {workoutData.totalVolume.toLocaleString()} kg
        </Text>
      </View>
    </LinearGradient>
  );
}

function PostCard({ post, index, isDark, likedPosts, toggleLike }: {
  post: typeof posts[0]; index: number; isDark: boolean;
  likedPosts: Set<string>; toggleLike: (id: string) => void;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const postUser = users.find(u => u.id === post.userId);
  const isLiked = likedPosts.has(post.id);
  const community = communities.find(c => c.id === post.community);
  const sportColor = (Colors.sport as any)[post.community] || Colors.primary;
  const [saved, setSaved] = useState(post.saved || false);

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 60)}>
      <View style={[styles.postCard, { backgroundColor: theme.card }]}>
        <View style={styles.postHeader}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/user-profile/[id]' as any, params: { id: post.userId } });
            }}
            style={styles.postHeaderLeft}
          >
            <View style={[styles.postAvatar, { backgroundColor: sportColor + '25' }]}>
              <Text style={[styles.postAvatarText, { color: sportColor }]}>
                {getInitials(postUser?.name || 'U')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.postUsername, { color: theme.text }]}>
                {postUser?.name || 'User'}
              </Text>
              <View style={styles.postMetaRow}>
                <View style={[styles.postCommunityTag, { backgroundColor: sportColor + '18' }]}>
                  <Text style={[styles.postCommunityTagText, { color: sportColor }]}>
                    {community?.name || ''}
                  </Text>
                </View>
                <Text style={[styles.postTime, { color: theme.textMuted }]}>
                  {timeSince(post.timestamp)}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={[styles.postContent, { color: theme.text }]}>{post.content}</Text>

        {post.type === 'image' && (post as any).imageUrl && (
          <Image
            source={{ uri: (post as any).imageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {post.type === 'video' && (post as any).videoThumbnail && (
          <View style={styles.videoContainer}>
            <Image
              source={{ uri: (post as any).videoThumbnail }}
              style={styles.postImage}
              resizeMode="cover"
            />
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={28} color="#fff" />
              </View>
            </View>
          </View>
        )}

        {post.type === 'workout_share' && (post as any).workoutData && (
          <WorkoutShareCard workoutData={(post as any).workoutData} />
        )}

        <View style={[styles.postActions, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => {
              toggleLike(post.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.postAction}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#FF4458' : theme.textMuted}
            />
            <Text style={[styles.postActionText, { color: isLiked ? '#FF4458' : theme.textMuted }]}>
              {post.likes + (isLiked && !post.liked ? 1 : 0)}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/comments/[postId]' as any, params: { postId: post.id } });
            }}
            style={styles.postAction}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.postActionText, { color: theme.textMuted }]}>
              {post.comments.length}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={styles.postAction}
          >
            <Ionicons name="share-outline" size={20} color={theme.textMuted} />
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => {
              setSaved(s => !s);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.postAction}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? Colors.primary : theme.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function CommunitiesScreen() {
  // Phase 1: social is hidden, so the default (tabs) route lands on Workout.
  if (!isEnabled('social')) return <Redirect href="/(tabs)/coach" />;

  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, likedPosts, toggleLike, user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const showNudge = user && user.profileComplete === false && !nudgeDismissed;

  const filteredPosts = selectedFilter === 'all'
    ? posts
    : posts.filter(p => p.community === selectedFilter);

  const filterData = [{ id: 'all', name: 'All', icon: 'globe-outline' }, ...communities.filter(c => c.id !== 'all')];

  const headerComponent = () => (
    <View>
      <View style={[styles.screenHeader, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 12 }]}>
        <Text style={[styles.screenTitle, { color: Colors.primary }]}>Nafas</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/find-partner' as any);
          }}
          style={[styles.headerButton, { backgroundColor: theme.card }]}
        >
          <Ionicons name="people" size={20} color={Colors.primary} />
        </Pressable>
      </View>

      {showNudge && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.nudgeBanner}>
          <LinearGradient
            colors={[Colors.primary + '22', Colors.primary + '08']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.nudgeInner, { borderColor: Colors.primary + '35' }]}
          >
            <View style={[styles.nudgeIconBg, { backgroundColor: Colors.primary + '25' }]}>
              <Ionicons name="person-circle-outline" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>Complete your profile</Text>
              <Text style={styles.nudgeSub}>Add your stats, interests & goals</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding' as any); }}
              style={styles.nudgeBtn}
            >
              <Text style={styles.nudgeBtnText}>Set Up</Text>
            </Pressable>
            <Pressable onPress={() => { setNudgeDismissed(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.nudgeClose}>
              <Ionicons name="close" size={16} color={Colors.primary} />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      <FlatList
        data={filterData}
        horizontal
        scrollEnabled={filterData.length > 0}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedFilter === item.id;
          return (
            <Pressable
              onPress={() => {
                setSelectedFilter(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected ? Colors.primary : theme.card,
                  borderColor: isSelected ? Colors.primary : theme.border,
                },
              ]}
            >
              <Ionicons
                name={item.icon as any}
                size={14}
                color={isSelected ? '#fff' : theme.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.filterChipText,
                { color: isSelected ? '#fff' : theme.textSecondary },
              ]}>
                {item.name}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredPosts}
        keyExtractor={item => item.id}
        ListHeaderComponent={headerComponent}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            index={index}
            isDark={isDark}
            likedPosts={likedPosts}
            toggleLike={toggleLike}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: Platform.OS === 'web' ? 84 + 16 : insets.bottom + 60 + 16, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={['#00C896', '#00A87A']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  screenTitle: { fontSize: 28, fontFamily: 'Rubik_700Bold' },
  headerButton: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  nudgeBanner: { marginHorizontal: 20, marginBottom: 12 },
  nudgeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1,
  },
  nudgeIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nudgeTitle: { fontSize: 14, fontFamily: 'Rubik_600SemiBold', color: '#00C896', marginBottom: 1 },
  nudgeSub: { fontSize: 11, fontFamily: 'Rubik_400Regular', color: '#9B9BB0' },
  nudgeBtn: {
    backgroundColor: '#00C896', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10,
  },
  nudgeBtnText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold', color: '#fff' },
  nudgeClose: { padding: 4 },
  filterChips: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  postCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16 },
  postHeader: { marginBottom: 12 },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  postAvatarText: { fontSize: 16, fontFamily: 'Rubik_700Bold' },
  postUsername: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  postCommunityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  postCommunityTagText: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  postTime: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  postContent: {
    fontSize: 15, fontFamily: 'Rubik_400Regular', lineHeight: 22, marginBottom: 12,
  },
  postImage: {
    width: '100%', height: 220, borderRadius: 12, marginBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  videoContainer: { position: 'relative', marginBottom: 12 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  playButton: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  postActions: {
    flexDirection: 'row', alignItems: 'center', gap: 18, borderTopWidth: 1, paddingTop: 12,
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postActionText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  workoutCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  workoutIconBg: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  workoutType: {
    fontSize: 16, fontFamily: 'Rubik_700Bold', color: '#fff',
  },
  workoutDuration: {
    fontSize: 12, fontFamily: 'Rubik_400Regular', color: 'rgba(255,255,255,0.75)',
  },
  workoutDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12,
  },
  workoutExercise: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  workoutExName: {
    fontSize: 14, fontFamily: 'Rubik_500Medium', color: '#fff',
  },
  workoutExSets: {
    fontSize: 12, fontFamily: 'Rubik_400Regular', color: 'rgba(255,255,255,0.7)',
  },
  workoutFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  workoutVolume: {
    fontSize: 14, fontFamily: 'Rubik_600SemiBold', color: '#fff',
  },
  fab: {
    position: 'absolute', right: 20,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00C896',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
