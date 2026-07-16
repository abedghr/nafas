import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '@/lib/app-context';
import { alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { users, readyToTrainUsers, sportInterests } from '@/lib/mock-data';
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

  const initial = userData.name.charAt(0).toUpperCase();
  const isReady = item.status === 'ready';
  const activityLabel = sportInterests.find(s => s.id === item.activity)?.name || item.activity;
  const iconName = ACTIVITY_ICONS[item.activity] || 'fitness-outline';

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

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={[styles.partnerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.partnerRow}>
          <Pressable
            onPress={() => router.push(`/user-profile/${item.userId}`)}
            style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}
          >
            <Text style={[styles.avatarText, { color: Colors.primary }]}>{initial}</Text>
          </Pressable>

          <View style={styles.partnerInfo}>
            <Pressable onPress={() => router.push(`/user-profile/${item.userId}`)}>
              <Text style={[styles.partnerName, { color: theme.text }]}>{userData.name}</Text>
            </Pressable>

            <View style={styles.detailRow}>
              <Ionicons name={iconName as any} size={14} color={Colors.primary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{activityLabel}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>{item.location}</Text>
            </View>
          </View>

          <View style={[
            styles.statusBadge,
            { backgroundColor: isReady ? Colors.primary + '18' : '#F59E0B18' }
          ]}>
            <View style={[styles.statusDot, { backgroundColor: isReady ? Colors.primary : '#F59E0B' }]} />
            <Text style={[styles.statusText, { color: isReady ? Colors.primary : '#F59E0B' }]}>
              {isReady ? 'Ready Now' : 'Scheduled'}
            </Text>
          </View>
        </View>

        {!isReady && scheduledLabel ? (
          <View style={styles.scheduledRow}>
            <Ionicons name="time-outline" size={13} color="#F59E0B" />
            <Text style={[styles.scheduledText, { color: '#F59E0B' }]}>{scheduledLabel}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleTrainTogether}
          style={({ pressed }) => [
            styles.trainButton,
            { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="people-outline" size={18} color="#fff" />
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
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Find a Partner</Text>
        <View style={styles.headerBtn} />
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
                    <View style={[styles.statusDotLarge, { backgroundColor: isReady ? Colors.primary : theme.textMuted }]} />
                    <Text style={[styles.statusCardTitle, { color: theme.text }]}>Ready to Train</Text>
                  </View>
                  <Switch
                    value={isReady}
                    onValueChange={(val) => {
                      setIsReady(val);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    trackColor={{ false: theme.border, true: Colors.primary + '60' }}
                    thumbColor={isReady ? Colors.primary : theme.textMuted}
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
                                backgroundColor: active ? Colors.primary + '20' : theme.cardAlt,
                                borderColor: active ? Colors.primary : theme.border,
                              },
                            ]}
                          >
                            <Ionicons name={sport.icon as any} size={16} color={active ? Colors.primary : theme.textSecondary} />
                            <Text style={[styles.chipText, { color: active ? Colors.primary : theme.textSecondary }]}>
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

                    <View style={[styles.yourStatusBanner, { backgroundColor: Colors.primary + '12' }]}>
                      <View style={[styles.statusDot, { backgroundColor: Colors.primary }]} />
                      <Text style={[styles.yourStatusText, { color: Colors.primary }]}>
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
              <Text style={[styles.partnersSectionTitle, { color: theme.text }]}>Available Partners</Text>
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
                          backgroundColor: active ? Colors.primary : theme.cardAlt,
                          borderColor: active ? Colors.primary : theme.border,
                        },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={14} color={active ? '#fff' : theme.textSecondary} />
                      <Text style={[styles.filterChipText, { color: active ? '#fff' : theme.textSecondary }]}>
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
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
              <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Partners Found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              No one is training in this category right now. Toggle your status to "Ready" and be the first!
            </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusCard: {
    borderRadius: 16,
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
  statusCardTitle: {
    fontSize: 17,
    fontFamily: 'Rubik_600SemiBold',
  },
  statusSubtext: {
    fontSize: 13,
    fontFamily: 'Rubik_400Regular',
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    padding: 0,
  },
  yourStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  yourStatusText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
  },
  partnersSectionTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    marginBottom: 12,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Rubik_500Medium',
  },
  partnerCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Rubik_700Bold',
  },
  partnerInfo: {
    flex: 1,
    gap: 3,
  },
  partnerName: {
    fontSize: 15,
    fontFamily: 'Rubik_600SemiBold',
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Rubik_400Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Rubik_600SemiBold',
  },
  scheduledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    marginLeft: 60,
  },
  scheduledText: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
  },
  trainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  trainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Rubik_600SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Rubik_700Bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Rubik_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
