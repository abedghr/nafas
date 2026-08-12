import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, Chip, SectionHeader, EmptyState } from '@/components/ui';
import { users, readyToTrainUsers, sportInterests, ranks } from '@/lib/mock-data';
import type { ReadyUser } from '@/lib/mock-data';

const ACTIVITY_ICONS: Record<string, string> = {
  calisthenics: 'body-outline',
  gym: 'barbell-outline',
  football: 'football-outline',
  tennis: 'tennisball-outline',
  running: 'walk-outline',
  swimming: 'water-outline',
  crossfit: 'fitness-outline',
};

function PartnerCard({ item, theme, index }: { item: ReadyUser; theme: typeof Colors.dark; index: number }) {
  const userData = users.find(u => u.id === item.userId);
  if (!userData) return null;

  const isReady = item.status === 'ready';
  const activityLabel = sportInterests.find(s => s.id === item.activity)?.name || item.activity;
  const iconName = ACTIVITY_ICONS[item.activity] || 'fitness-outline';
  const rankInfo = ranks.find(r => r.id === userData.rank);
  const interests = (userData.interests || []).slice(0, 3);

  const scheduledLabel = item.scheduledTime
    ? new Date(item.scheduledTime).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    : '';

  const handleTrainTogether = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    alertDialog(
      'Request Sent!',
      `Your training request has been sent to ${userData.name}. They'll be notified shortly.`
    );
  };

  const statusColor = isReady ? Colors.electric : Colors.semantic.warn;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={[styles.partnerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.partnerRow}>
          <Pressable
            onPress={() => router.push(`/user-profile/${item.userId}`)}
            style={styles.thumbWrap}
          >
            <Image source={{ uri: userData.avatar }} style={styles.thumb} contentFit="cover" transition={200} />
          </Pressable>

          <View style={styles.partnerInfo}>
            <Pressable onPress={() => router.push(`/user-profile/${item.userId}`)}>
              <Display variant="d3" color={theme.text} numberOfLines={1}>{userData.name}</Display>
            </Pressable>

            <View style={styles.metaRow}>
              <Ionicons name={iconName as any} size={13} color={Colors.electric} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>{activityLabel}</Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={13} color={theme.textMuted} />
              <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isReady ? 'Ready Now' : 'Scheduled'}
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          {rankInfo && (
            <View style={[styles.levelBadge, { backgroundColor: rankInfo.color + '1A' }]}>
              <Ionicons name={rankInfo.icon as any} size={13} color={rankInfo.color} />
              <Text style={[styles.levelText, { color: rankInfo.color }]}>{rankInfo.name}</Text>
            </View>
          )}
          {!isReady && scheduledLabel ? (
            <View style={[styles.levelBadge, { backgroundColor: Colors.semantic.warn + '1A' }]}>
              <Ionicons name="time-outline" size={13} color={Colors.semantic.warn} />
              <Text style={[styles.levelText, { color: Colors.semantic.warn }]}>{scheduledLabel}</Text>
            </View>
          ) : null}
        </View>

        {interests.length > 0 && (
          <View style={styles.interestRow}>
            {interests.map(id => (
              <Chip key={id} label={sportInterests.find(s => s.id === id)?.name || id} />
            ))}
          </View>
        )}

        <Pressable
          onPress={handleTrainTogether}
          style={({ pressed }) => [
            styles.trainButton,
            { backgroundColor: Colors.electric, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="people-outline" size={18} color="#04120B" />
          <Text style={styles.trainButtonText}>Train Together</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function FindPartnerScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  const [isReady, setIsReady] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [location, setLocation] = useState('');
  const [filterActivity, setFilterActivity] = useState('all');

  const filteredPartners = useMemo(() => {
    return readyToTrainUsers.filter(p => {
      if (user && p.userId === user.id) return false;
      if (filterActivity !== 'all' && p.activity !== filterActivity) return false;
      return true;
    });
  }, [filterActivity, user]);

  const filterOptions = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    ...sportInterests,
  ];

  const topPadding = Platform.OS === 'web' ? 67 + 16 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text} style={styles.headerTitle}>Find a Partner</Display>
        <View style={styles.iconBtn} />
      </View>

      <FlatList
        data={filteredPartners}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statusCardHeader}>
                  <View style={styles.statusLabelRow}>
                    <View style={[styles.statusDotLarge, { backgroundColor: isReady ? Colors.electric : theme.textMuted }]} />
                    <Display variant="d3" color={theme.text}>Ready to Train</Display>
                  </View>
                  <Switch
                    value={isReady}
                    onValueChange={(val) => {
                      setIsReady(val);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    trackColor={{ false: theme.border, true: Colors.electric + '60' }}
                    thumbColor={isReady ? Colors.electric : theme.textMuted}
                  />
                </View>

                {isReady ? (
                  <Animated.View entering={FadeInDown.springify()}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Select Activity</Text>
                    <View style={styles.chipRow}>
                      {sportInterests.map(sport => {
                        const active = selectedActivity === sport.id;
                        return (
                          <Pressable
                            key={sport.id}
                            onPress={() => {
                              setSelectedActivity(sport.id);
                              Haptics.selectionAsync();
                            }}
                            style={[
                              styles.chip,
                              {
                                backgroundColor: active ? Colors.electric : theme.cardAlt,
                                borderColor: active ? Colors.electric : theme.border,
                              },
                            ]}
                          >
                            <Ionicons name={sport.icon as any} size={15} color={active ? '#04120B' : theme.textSecondary} />
                            <Text style={[styles.chipText, { color: active ? '#04120B' : theme.textSecondary }]}>
                              {sport.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 14 }]}>Location</Text>
                    <View style={[styles.locationInput, { backgroundColor: theme.cardAlt, borderColor: theme.border }]}>
                      <Ionicons name="location-outline" size={18} color={theme.textMuted} />
                      <TextInput
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Where are you training?"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.locationTextInput, { color: theme.text }]}
                      />
                    </View>

                    <View style={[styles.yourStatusBanner, { backgroundColor: Colors.electric + '14' }]}>
                      <View style={[styles.statusDot, { backgroundColor: Colors.electric }]} />
                      <Text style={[styles.yourStatusText, { color: Colors.electric }]}>
                        You're visible to nearby athletes
                      </Text>
                    </View>
                  </Animated.View>
                ) : (
                  <Text style={[styles.statusSubtext, { color: theme.textMuted }]}>
                    Toggle on to let others know you're available
                  </Text>
                )}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).springify()}>
              <SectionHeader title="Available Partners" style={styles.partnersSectionHeader} />
              <FlatList
                data={filterOptions}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.filterRow}
                scrollEnabled={true}
                renderItem={({ item: opt }) => {
                  const active = filterActivity === opt.id;
                  return (
                    <Pressable
                      onPress={() => {
                        setFilterActivity(opt.id);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? Colors.electric : theme.card,
                          borderColor: active ? Colors.electric : theme.border,
                        },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={14} color={active ? '#04120B' : theme.textSecondary} />
                      <Text style={[styles.filterChipText, { color: active ? '#04120B' : theme.textSecondary }]}>
                        {opt.name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </Animated.View>
          </View>
        }
        renderItem={({ item, index }) => (
          <PartnerCard item={item} theme={theme} index={index} />
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <EmptyState
              icon="people-outline"
              title="No Partners Found"
              subtitle={'No one is training in this category right now. Toggle your status to "Ready" and be the first!'}
            />
          </Animated.View>
        }
        ListFooterComponent={<View style={{ height: insets.bottom + 24 }} />}
      />
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
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statusCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusSubtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 10,
  },
  sectionLabel: {
    ...Type.overline,
    marginTop: 16,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationTextInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    padding: 0,
  },
  yourStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  yourStatusText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  partnersSectionHeader: {
    marginBottom: 12,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  partnerCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  partnerInfo: {
    flex: 1,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
  },
  levelText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  interestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    height: 48,
    borderRadius: 999,
  },
  trainButtonText: {
    color: '#04120B',
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
});
