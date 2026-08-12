import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, Button, EmptyState } from '@/components/ui';
import { useApp } from '@/lib/app-context';
import { posts, users } from '@/lib/mock-data';

interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  liked: boolean;
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w`;
}

function getUserById(userId: string) {
  return users.find(u => u.id === userId);
}

function CommentItem({ item, index }: { item: Comment; index: number }) {
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [liked, setLiked] = useState(item.liked);
  const commentUser = getUserById(item.userId);
  const displayName = commentUser?.username ?? 'user';
  const initial = (commentUser?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(300).springify()}
      style={styles.commentRow}
    >
      {commentUser?.avatar ? (
        <ExpoImage source={{ uri: commentUser.avatar }} style={styles.avatarImg} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.avatarCircle, { backgroundColor: theme.cardAlt }]}>
          <Text style={[styles.avatarLetter, { color: theme.text }]}>{initial}</Text>
        </View>
      )}
      <View style={[styles.commentBubble, { backgroundColor: theme.card }]}>
        <Text style={[styles.commentText, { color: theme.text }]}>
          <Text style={[styles.commentUsername, { color: theme.text }]}>{displayName} </Text>
          {item.text}
        </Text>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentTime, { color: theme.textMuted }]}>{getRelativeTime(item.timestamp)}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => setLiked(prev => !prev)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.commentLike}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={16}
          color={liked ? Colors.electric : theme.textMuted}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const insets = useSafeAreaInsets();
  const { isDark, user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const post = posts.find(p => p.id === postId);
  const initialComments: Comment[] = (post?.comments ?? []).map(c => ({
    ...c,
    liked: false,
  }));

  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [inputText, setInputText] = useState('');

  const currentUserInitial = (user?.name ?? 'Y').charAt(0).toUpperCase();

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newComment: Comment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId: user?.id ?? 'u1',
      text: trimmed,
      timestamp: new Date().toISOString(),
      liked: false,
    };
    setComments(prev => [newComment, ...prev]);
    setInputText('');
  }, [inputText, user]);

  const renderItem = useCallback(
    ({ item, index }: { item: Comment; index: number }) => (
      <CommentItem item={item} index={index} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: Comment) => item.id, []);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor: theme.surface,
              paddingTop: Math.max(insets.top, 8) + webTopInset,
            },
          ]}
        >
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Display variant="d3" color={theme.text}>Comments</Display>
            <Button variant="icon" icon="close" onPress={() => router.back()} />
          </View>

          {comments.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="chatbubble-ellipses-outline"
                title="No comments yet"
                subtitle="Be the first!"
              />
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          )}

          <View
            style={[
              styles.inputBar,
              {
                paddingBottom: Math.max(insets.bottom, 12) + webBottomInset,
                borderTopColor: theme.border,
              },
            ]}
          >
            {user?.avatar ? (
              <ExpoImage source={{ uri: user.avatar }} style={styles.inputAvatarImg} contentFit="cover" />
            ) : (
              <View style={[styles.inputAvatar, { backgroundColor: Colors.electric }]}>
                <Text style={styles.inputAvatarLetter}>{currentUserInitial}</Text>
              </View>
            )}
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.card, color: theme.text }]}
              placeholder="Add a comment..."
              placeholderTextColor={theme.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                { backgroundColor: inputText.trim() ? Colors.electric : theme.cardAlt },
              ]}
              disabled={!inputText.trim()}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={inputText.trim() ? '#04120B' : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  modal: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarLetter: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  commentBubble: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  commentUsername: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  commentTime: {
    ...Type.caption,
  },
  commentLike: {
    paddingTop: 10,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  inputAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  inputAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 4,
  },
  inputAvatarLetter: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
    color: '#04120B',
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: Fonts.regular,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});
