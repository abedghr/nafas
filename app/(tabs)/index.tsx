import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, Button } from '@/components/ui';
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
      colors={['#12352A', '#0A1C15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.workoutCard}
    >
      <View style={styles.workoutHeader}>
        <View style={styles.workoutIconBg}>
          <Ionicons name="barbell" size={18} color={Colors.electric} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.workoutType}>{workoutData.type}</Text>
          <Text style={styles.workoutDuration}>{workoutData.duration} min</Text>
        </View>
        <Ionicons name="fitness" size={22} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.workoutDivider} />
      {workoutData.exercises.map((ex: any, i: number) => {
        const maxWeight = Math.max(...ex.sets.map((s: any) => s.weight));
        return (
          <View key={i} style={styles.workoutExercise}>
            <Text style={styles.workoutExName}>{ex.name}</Text>
            <Text style={styles.workoutExSets}>
              {ex.sets.length} sets{maxWeight > 0 ? ` · ${maxWeight}kg max` : ''}
            </Text>
          </View>
        );
      })}
      <View style={styles.workoutDivider} />
      <View style={styles.workoutFooter}>
        <Ionicons name="flame" size={16} color={Colors.electric} />
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
      <View style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.postHeader}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: '/user-profile/[id]' as any, params: { id: post.userId } });
            }}
            style={styles.postHeaderLeft}
          >
            {postUser?.avatar ? (
              <View style={[styles.postAvatarRing, { borderColor: sportColor + '55' }]}>
                <ExpoImage source={{ uri: postUser.avatar }} style={styles.postAvatarImg} contentFit="cover" transition={200} />
              </View>
            ) : (
              <View style={[styles.postAvatar, { backgroundColor: sportColor + '25' }]}>
                <Text style={[styles.postAvatarText, { color: sportColor }]}>
                  {getInitials(postUser?.name || 'U')}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.postUsername, { color: theme.text }]}>
                {postUser?.name || 'User'}
              </Text>
              <View style={styles.postMetaRow}>
                <View style={[styles.postCommunityTag, { backgroundColor: sportColor + '1A' }]}>
                  <View style={[styles.postCommunityDot, { backgroundColor: sportColor }]} />
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
          <View style={styles.mediaWrap}>
            <ExpoImage
              source={{ uri: (post as any).imageUrl }}
              style={styles.postImage}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {post.type === 'video' && (post as any).videoThumbnail && (
          <View style={styles.mediaWrap}>
            <ExpoImage
              source={{ uri: (post as any).videoThumbnail }}
              style={styles.postImage}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(5,10,8,0.35)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={26} color="#04120B" />
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
            style={[styles.postAction, isLiked && { backgroundColor: Colors.electric + '18' }]}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? Colors.electric : theme.textMuted}
            />
            <Text style={[styles.postActionText, { color: isLiked ? Colors.electric : theme.textMuted }]}>
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
            <Ionicons name="chatbubble-outline" size={19} color={theme.textMuted} />
            <Text style={[styles.postActionText, { color: theme.textMuted }]}>
              {post.comments.length}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            style={styles.postAction}
          >
            <Ionicons name="share-outline" size={19} color={theme.textMuted} />
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
              size={19}
              color={saved ? Colors.electric : theme.textMuted}
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
        <Display variant="d2" color={Colors.electric}>Nafas</Display>
        <Button
          variant="icon"
          icon="people-outline"
          onPress={() => router.push('/find-partner' as any)}
        />
      </View>

      {showNudge && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.nudgeBanner}>
          <LinearGradient
            colors={[Colors.electric + '22', Colors.electric + '06']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.nudgeInner, { borderColor: Colors.electric + '35' }]}
          >
            <View style={[styles.nudgeIconBg, { backgroundColor: Colors.electric + '25' }]}>
              <Ionicons name="person-circle-outline" size={24} color={Colors.electric} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nudgeTitle, { color: theme.text }]}>Complete your profile</Text>
              <Text style={[styles.nudgeSub, { color: theme.textMuted }]}>Add your stats, interests & goals</Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/onboarding' as any); }}
              style={styles.nudgeBtn}
            >
              <Text style={styles.nudgeBtnText}>Set Up</Text>
            </Pressable>
            <Pressable onPress={() => { setNudgeDismissed(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.nudgeClose}>
              <Ionicons name="close" size={16} color={Colors.electric} />
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      <FlatList
        data={filterData}
        horizontal
        scrollEnabled={filterData.length > 0}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyRail}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedFilter === item.id;
          const itemColor = (Colors.sport as any)[item.id] || Colors.electric;
          return (
            <Pressable
              onPress={() => {
                setSelectedFilter(item.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.storyItem}
            >
              {isSelected ? (
                <LinearGradient
                  colors={[Colors.electric, Colors.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                >
                  <View style={[styles.storyInner, { backgroundColor: theme.background }]}>
                    <Ionicons name={item.icon as any} size={22} color={Colors.electric} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={[styles.storyPlain, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name={item.icon as any} size={22} color={itemColor} />
                </View>
              )}
              <Text
                style={[styles.storyLabel, { color: isSelected ? theme.text : theme.textMuted, fontFamily: isSelected ? Fonts.semibold : Fonts.medium }]}
                numberOfLines={1}
              >
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
          colors={[Colors.electric, Colors.electricPressed]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#04120B" />
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
  nudgeBanner: { marginHorizontal: 20, marginBottom: 12 },
  nudgeInner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1,
  },
  nudgeIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nudgeTitle: { ...Type.bodyMed, marginBottom: 1 },
  nudgeSub: { ...Type.caption },
  nudgeBtn: {
    backgroundColor: Colors.electric, paddingHorizontal: 14, height: 34,
    borderRadius: 999, alignItems: 'center', justifyContent: 'center',
  },
  nudgeBtnText: { fontSize: 12, fontFamily: Fonts.bold, color: '#04120B' },
  nudgeClose: { padding: 4 },
  storyRail: { paddingHorizontal: 20, gap: 16, paddingBottom: 18, paddingTop: 2 },
  storyItem: { alignItems: 'center', gap: 6, width: 66 },
  storyRing: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  storyInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  storyPlain: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  storyLabel: { fontSize: 11, maxWidth: 66, textAlign: 'center' },
  postCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 16, borderWidth: 1 },
  postHeader: { marginBottom: 12 },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  postAvatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  postAvatarRing: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 2, padding: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarImg: { width: '100%', height: '100%', borderRadius: 20 },
  postAvatarText: { fontSize: 16, fontFamily: Fonts.bold },
  postUsername: { ...Type.h2 },
  postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  postCommunityTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
  },
  postCommunityDot: { width: 6, height: 6, borderRadius: 3 },
  postCommunityTagText: { fontSize: 11, fontFamily: Fonts.semibold },
  postTime: { ...Type.caption },
  postContent: {
    ...Type.body, lineHeight: 22, marginBottom: 12,
  },
  mediaWrap: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 12, backgroundColor: '#0E0E16',
  },
  postImage: {
    width: '100%', height: 220,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  playButton: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.electric,
    alignItems: 'center', justifyContent: 'center',
  },
  postActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 12,
  },
  postAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999,
  },
  postActionText: { fontSize: 13, fontFamily: Fonts.semibold },
  workoutCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  workoutIconBg: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.electric + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  workoutType: {
    fontSize: 16, fontFamily: Fonts.bold, color: '#fff',
  },
  workoutDuration: {
    fontSize: 12, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.75)',
  },
  workoutDivider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 12,
  },
  workoutExercise: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  workoutExName: {
    fontSize: 14, fontFamily: Fonts.medium, color: '#fff',
  },
  workoutExSets: {
    fontSize: 12, fontFamily: Fonts.mono, color: 'rgba(255,255,255,0.7)',
  },
  workoutFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  workoutVolume: {
    fontSize: 14, fontFamily: Fonts.semibold, color: '#fff',
  },
  fab: {
    position: 'absolute', right: 20,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.electric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
