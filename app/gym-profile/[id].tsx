import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { Display, HeroCard, Chip, SectionHeader, Button, StatTile, EmptyState } from '@/components/ui';
import { gymsApi, classesApi, reviewsApi, type ApiGym, type ClassItem, type GymReview } from '@/src/features/gyms/api';
import { eventsApi, type ApiEvent } from '@/src/features/events/api';

type TabKey = 'about' | 'classes' | 'team' | 'posts';

export default function GymProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<TabKey>('about');
  const [gym, setGym] = useState<ApiGym | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [gymEvents, setGymEvents] = useState<ApiEvent[]>([]);
  const [reviews, setReviews] = useState<GymReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadClasses = () => { if (id) classesApi.forGym(String(id)).then(setClasses).catch(() => {}); };
  const loadReviews = () => {
    if (!id) return;
    reviewsApi.forGym(String(id)).then(rs => {
      setReviews(rs);
      const mine = rs.find(r => r.mine);
      if (mine) { setMyRating(mine.rating); setMyComment(mine.comment); }
    }).catch(() => {});
  };
  const submitReview = () => {
    if (!gym || myRating < 1) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setReviewOpen(false);
    reviewsApi.submit(gym.id, myRating, myComment)
      .then(() => { loadReviews(); gymsApi.get(gym.id).then(setGym).catch(() => {}); })
      .catch(() => {});
  };
  useEffect(() => {
    let active = true;
    if (!id) return;
    gymsApi.get(String(id))
      .then(g => { if (active) { setGym(g); setStatus('ok'); } })
      .catch(() => { if (active) setStatus('error'); });
    loadClasses();
    loadReviews();
    eventsApi.forGym(String(id)).then(setGymEvents).catch(() => {});
    return () => { active = false; };
  }, [id]);

  const manages = !!gym?.canManage;

  const joinClass = (c: ClassItem) => {
    if (manages) return; // you manage this gym — can't enroll
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (c.myStatus === 'enrolled' || c.myStatus === 'pending') {
      setClasses(cs => cs.map(x => x.id === c.id ? { ...x, myStatus: null } : x));
      classesApi.cancel(c.id).catch(loadClasses);
    } else {
      setClasses(cs => cs.map(x => x.id === c.id ? { ...x, myStatus: 'pending' } : x));
      classesApi.join(c.id).catch(loadClasses);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const handleCall = () => { if (gym?.phone) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${gym.phone}`); } };
  const handleWhatsapp = () => {
    if (!gym?.whatsapp) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://wa.me/${gym.whatsapp.replace(/[^0-9]/g, '')}`);
  };
  const handleDirections = () => {
    if (gym?.lat == null || gym?.lng == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`);
  };

  if (status !== 'ok' || !gym) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
          <Pressable onPress={back} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyContainer}>
          {status === 'loading'
            ? <ActivityIndicator color={Colors.electric} />
            : <EmptyState icon="alert-circle-outline" title={t('discover.not_found')} />}
        </View>
      </View>
    );
  }

  const tabs: { key: TabKey; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'about', icon: 'information-circle-outline', label: t('discover.about', { defaultValue: 'About' }) },
    { key: 'classes', icon: 'barbell-outline', label: t('discover.classes', { defaultValue: 'Classes' }) },
    { key: 'team', icon: 'people-outline', label: t('discover.team', { defaultValue: 'Team' }) },
    { key: 'posts', icon: 'images-outline', label: t('discover.posts', { defaultValue: 'Posts' }) },
  ];

  const canCall = !!gym.phone;
  const canWhatsapp = !!gym.whatsapp;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); back(); }} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{gym.name}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}>
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <HeroCard image={gym.coverUrl ? { uri: gym.coverUrl } : undefined} height={236} style={{ marginBottom: 16 }}>
            <View style={styles.heroMeta}>
              <View style={styles.heroPill}><Ionicons name="star" size={13} color="#FFD700" /><Text style={styles.heroPillText}>{gym.rating}</Text></View>
              <View style={styles.heroPill}><Ionicons name="people-outline" size={13} color="#fff" /><Text style={styles.heroPillText}>{gym.memberCount} {t('discover.members')}</Text></View>
            </View>
            <Display variant="d1" color="#fff" numberOfLines={2}>{gym.name}</Display>
            <View style={styles.heroAddr}>
              <Ionicons name="location-outline" size={14} color="#E6F5EE" />
              <Text style={styles.heroAddrText} numberOfLines={1}>{gym.address}</Text>
            </View>
          </HeroCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {tabs.map(({ key, icon, label }) => {
              const isActive = activeTab === key;
              return (
                <Pressable key={key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(key); }}
                  style={[styles.tabButton, isActive && { backgroundColor: Colors.electric }]}>
                  <Ionicons name={icon} size={16} color={isActive ? '#04120B' : theme.textMuted} />
                  <Text style={[styles.tabText, { color: isActive ? '#04120B' : theme.textMuted }]} numberOfLines={1}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {activeTab === 'about' && (
          <>
            {!!gym.description && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.about', { defaultValue: 'About' })} />
                <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{gym.description}</Text>
              </View>
            )}

            <View style={styles.statRow}>
              <StatTile icon="people-outline" value={String(gym.memberCount)} label={t('discover.members')} />
              <StatTile icon="star" color="#FFD700" value={String(gym.rating)} label={t('discover.rating', { defaultValue: 'Rating' })} />
              <StatTile icon="chatbox-ellipses-outline" value={String(gym.reviewsCount)} label={t('discover.reviews')} />
            </View>

            {!!gym.workingHours && (
              <View style={[styles.hoursCard, { backgroundColor: theme.card }]}>
                <View style={[styles.hoursIcon, { backgroundColor: Colors.electric + '18' }]}>
                  <Ionicons name="time-outline" size={18} color={Colors.electric} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hoursLabel, { color: theme.textMuted }]}>{t('discover.working_hours')}</Text>
                  <Text style={[styles.hoursValue, { color: theme.text }]}>{gym.workingHours}</Text>
                </View>
              </View>
            )}

            {gym.types.length > 0 && (
              <View style={styles.block}>
                <View style={styles.chipWrap}>
                  {gym.types.map((ty) => <Chip key={ty} label={ty} />)}
                </View>
              </View>
            )}

            {gym.facilities.length > 0 && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.facilities')} />
                <View style={styles.facGrid}>
                  {gym.facilities.map((facility) => (
                    <View key={facility.id} style={[styles.facCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={[styles.facIcon, { backgroundColor: Colors.electric + '18' }]}>
                        {facility.logoUrl
                          ? <Image source={{ uri: facility.logoUrl }} style={styles.facImg} contentFit="contain" />
                          : <Ionicons name={(facility.icon || 'checkmark-circle-outline') as any} size={18} color={Colors.electric} />}
                      </View>
                      <Text style={[styles.facTitle, { color: theme.text }]} numberOfLines={2}>{facility.title}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {gym.lat != null && gym.lng != null && (
              <Pressable onPress={handleDirections} style={styles.mapCard}>
                <LinearGradient colors={['#12332A', '#0B1F18']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['transparent', 'rgba(5,10,8,0.7)']} style={StyleSheet.absoluteFill} />
                <View style={styles.mapPin}><Ionicons name="location" size={22} color="#04120B" /></View>
                <View style={styles.mapFooter}>
                  <Text style={styles.mapAddr} numberOfLines={1}>{gym.address}</Text>
                  <View style={styles.mapDirBtn}>
                    <Ionicons name="navigate" size={13} color="#04120B" />
                    <Text style={styles.mapDirText}>{t('discover.directions')}</Text>
                  </View>
                </View>
              </Pressable>
            )}

            {gymEvents.length > 0 && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.events')} />
                {gymEvents.map((ev) => (
                  <Pressable key={ev.id} onPress={() => router.push(`/event-profile/${ev.id}` as any)} style={[styles.eventCard, { backgroundColor: theme.card }]}>
                    <View style={[styles.eventIcon, { backgroundColor: Colors.electric + '18' }]}><Ionicons name="trophy-outline" size={20} color={Colors.electric} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventName, { color: theme.text }]} numberOfLines={1}>{ev.name}</Text>
                      <Text style={[styles.eventMeta, { color: theme.textMuted }]}>{t(`discover.event_type_${ev.type}`)}{ev.startsAt ? ` · ${new Date(ev.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.reviewsHead}>
              <Text style={[Type.overline, { color: theme.textSecondary }]}>{t('discover.reviews')} {gym.reviewsCount > 0 ? `(${gym.reviewsCount})` : ''}</Text>
              <Pressable onPress={() => setReviewOpen(true)} style={styles.writeReviewBtn}>
                <Ionicons name="create-outline" size={15} color={Colors.electric} />
                <Text style={[styles.writeReviewText, { color: Colors.electric }]}>{reviews.some(r => r.mine) ? t('discover.edit_review') : t('discover.write_review')}</Text>
              </Pressable>
            </View>
            {reviews.length === 0 ? (
              <Text style={[styles.noReviews, { color: theme.textMuted }]}>{t('discover.no_reviews')}</Text>
            ) : reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card }]}>
                <View style={styles.reviewTop}>
                  {r.userAvatar
                    ? <Image source={{ uri: r.userAvatar }} style={styles.reviewAvatar} />
                    : <View style={[styles.reviewAvatar, { backgroundColor: Colors.electric + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={16} color={Colors.electric} /></View>}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewName, { color: theme.text }]}>{r.userName}{r.mine ? ` · ${t('discover.you')}` : ''}</Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={12} color="#FFD700" />)}
                    </View>
                  </View>
                </View>
                {!!r.comment && <Text style={[styles.reviewComment, { color: theme.textSecondary }]}>{r.comment}</Text>}
              </View>
            ))}
          </>
        )}

        {activeTab === 'classes' && (
          classes.length > 0 ? classes.map((c) => {
            const full = c.capacity > 0 && c.enrolledCount >= c.capacity;
            const cCancelable = c.myStatus === 'enrolled' || c.myStatus === 'pending';
            const label = c.myStatus === 'enrolled' ? t('discover.enrolled')
              : c.myStatus === 'pending' ? t('discover.pending_approval')
              : c.myStatus === 'rejected' ? t('discover.rejected')
              : full ? t('discover.class_full') : t('discover.join_class');
            return (
              <View key={c.id} style={[styles.classCard, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clsTitle, { color: theme.text }]}>{c.title}</Text>
                  <View style={styles.classMetaRow}>
                    {!!c.dayOfWeek && <Text style={[styles.classMeta, { color: theme.textMuted }]}>{t(`discover.weekdays.${c.dayOfWeek}`)}</Text>}
                    {!!c.startTime && <Text style={[styles.classMeta, { color: theme.textMuted }]}>· {c.startTime}</Text>}
                    {!!c.duration && <Text style={[styles.classMeta, { color: theme.textMuted }]}>· {c.duration}</Text>}
                  </View>
                  {!!c.coachName && <Text style={[styles.clsCoach, { color: theme.textSecondary }]}><Ionicons name="person-outline" size={11} color={theme.textMuted} /> {c.coachName}</Text>}
                  {c.capacity > 0 && <Text style={[styles.classMeta, { color: theme.textMuted }]}>{c.enrolledCount}/{c.capacity} {t('discover.enrolled_count')}</Text>}
                </View>
                {manages ? (
                  <View style={[styles.classJoinBtn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]}>
                    <Text style={[styles.classJoinText, { color: theme.textMuted }]}>—</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => joinClass(c)} disabled={full && !cCancelable}
                    style={[styles.classJoinBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.myStatus === 'enrolled' ? Colors.electric : c.myStatus ? theme.background : full ? theme.background : Colors.electric + '20', borderColor: Colors.electric, borderWidth: c.myStatus === 'enrolled' ? 0 : 1 }]}>
                    <Text style={[styles.classJoinText, { color: c.myStatus === 'enrolled' ? '#04120B' : full || c.myStatus ? theme.textMuted : Colors.electric }]}>{label}</Text>
                    {cCancelable && <Ionicons name="close" size={12} color={c.myStatus === 'enrolled' ? '#04120B' : theme.textMuted} />}
                  </Pressable>
                )}
              </View>
            );
          }) : (
            <View style={styles.emptyTabContainer}>
              <EmptyState icon="barbell-outline" title={t('discover.no_classes_yet', { defaultValue: 'No classes yet' })} subtitle={t('discover.no_classes_sub', { defaultValue: 'This gym has not scheduled any classes yet.' })} />
            </View>
          )
        )}

        {activeTab === 'team' && (
          gym.coaches && gym.coaches.length > 0 ? gym.coaches.map((co, index) => (
            <Animated.View key={co.id} entering={FadeInDown.delay(60 * (index + 1)).duration(400)}>
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/coach-profile/${co.id}` as any); }} style={[styles.teamCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {co.avatarUrl
                  ? <Image source={{ uri: co.avatarUrl }} style={styles.teamAvatar} />
                  : <View style={[styles.teamAvatar, { backgroundColor: Colors.electric + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={22} color={Colors.electric} /></View>}
                <View style={{ flex: 1 }}>
                  <View style={styles.teamNameRow}>
                    <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>{co.name}</Text>
                    {co.id === gym.headCoachId && (
                      <View style={[styles.headCoachBadge, { backgroundColor: Colors.electric + '20' }]}>
                        <Ionicons name="ribbon" size={10} color={Colors.electric} />
                        <Text style={styles.headCoachText}>{t('discover.head_coach')}</Text>
                      </View>
                    )}
                  </View>
                  {!!co.headline && <Text style={[styles.teamHeadline, { color: theme.textMuted }]} numberOfLines={1}>{co.headline}</Text>}
                  <View style={styles.teamRating}><Ionicons name="star" size={12} color="#FFD700" /><Text style={[styles.teamRatingText, { color: theme.textSecondary }]}>{co.rating}</Text></View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </Pressable>
            </Animated.View>
          )) : (
            <View style={styles.emptyTabContainer}>
              <EmptyState icon="people-outline" title={t('discover.no_team', { defaultValue: 'No team yet' })} subtitle={t('discover.no_team_sub', { defaultValue: 'This gym has not added any coaches yet.' })} />
            </View>
          )
        )}

        {activeTab === 'posts' && (
          <View style={styles.emptyTabContainer}>
            <EmptyState
              icon="images-outline"
              title={t('discover.no_posts', { defaultValue: 'No posts yet' })}
              subtitle={t('discover.no_posts_sub', { defaultValue: "This gym hasn't shared any posts or highlights yet." })}
            />
          </View>
        )}
      </ScrollView>

      {(canCall || canWhatsapp) && (
        <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
          {canCall && (
            <Button
              variant="solid"
              label={t('discover.call_gym', { defaultValue: 'Call gym' })}
              icon="call"
              onPress={handleCall}
              style={{ flex: 1 }}
            />
          )}
          {canWhatsapp && (
            <Pressable onPress={handleWhatsapp} style={styles.waBtn}>
              <Ionicons name="logo-whatsapp" size={24} color="#04120B" />
            </Pressable>
          )}
        </View>
      )}

      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Display variant="d3" color={theme.text}>{t('discover.rate_gym')}</Display>
              <Pressable onPress={() => setReviewOpen(false)}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
            </View>
            <View style={styles.ratePicker}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => { Haptics.selectionAsync(); setMyRating(n); }}>
                  <Ionicons name={n <= myRating ? 'star' : 'star-outline'} size={36} color="#FFD700" />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.reviewInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              value={myComment} onChangeText={setMyComment} multiline placeholder={t('discover.review_placeholder')} placeholderTextColor={theme.textMuted}
            />
            <Button variant="solid" label={t('discover.submit_review')} onPress={submitReview} disabled={myRating < 1} style={{ opacity: myRating < 1 ? 0.5 : 1 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: Fonts.semibold },
  scrollContent: { paddingHorizontal: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heroMeta: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingHorizontal: 10, height: 26 },
  heroPillText: { fontFamily: Fonts.semibold, fontSize: 12, color: '#fff' },
  heroAddr: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  heroAddrText: { fontFamily: Fonts.medium, fontSize: 13, color: '#E6F5EE', flexShrink: 1 },

  tabContainer: { marginBottom: 20 },
  tabBar: { flexDirection: 'row', borderRadius: 999, padding: 4, borderWidth: 1 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 999 },
  tabText: { fontSize: 13, fontFamily: Fonts.semibold },

  block: { marginBottom: 24 },
  descriptionText: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 22 },

  statRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },

  hoursCard: { borderRadius: 16, padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hoursLabel: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 2 },
  hoursValue: { fontSize: 15, fontFamily: Fonts.semibold },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  facGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  facCard: { width: '47.5%', flexBasis: '47.5%', flexGrow: 1, borderRadius: 16, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  facIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  facImg: { width: 22, height: 22 },
  facTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.semibold },

  mapCard: { height: 120, borderRadius: 16, overflow: 'hidden', marginBottom: 24, justifyContent: 'flex-end' },
  mapPin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -26, width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.electric, alignItems: 'center', justifyContent: 'center' },
  mapFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  mapAddr: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: '#E6F5EE' },
  mapDirBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.electric, borderRadius: 999, paddingHorizontal: 12, height: 30 },
  mapDirText: { fontFamily: Fonts.bold, fontSize: 12, color: '#04120B' },

  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 15, fontFamily: Fonts.semibold },
  eventMeta: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },

  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10 },
  clsTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  classMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  classMeta: { fontSize: 12, fontFamily: Fonts.regular },
  clsCoach: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 4 },
  classJoinBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  classJoinText: { fontSize: 12, fontFamily: Fonts.semibold },

  teamCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  teamAvatar: { width: 52, height: 52, borderRadius: 26 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  teamName: { fontSize: 15, fontFamily: Fonts.semibold },
  headCoachBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  headCoachText: { fontSize: 9, fontFamily: Fonts.semibold, color: Colors.electric },
  teamHeadline: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 3 },
  teamRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  teamRatingText: { fontSize: 12, fontFamily: Fonts.medium },

  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  writeReviewText: { fontSize: 13, fontFamily: Fonts.semibold },
  noReviews: { fontSize: 13, fontFamily: Fonts.regular, paddingVertical: 8 },
  reviewCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17 },
  reviewName: { fontSize: 14, fontFamily: Fonts.semibold },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewComment: { fontSize: 13, fontFamily: Fonts.regular, marginTop: 10, lineHeight: 19 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  waBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },

  emptyTabContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  ratePicker: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  reviewInput: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular, height: 100, textAlignVertical: 'top', marginBottom: 14, borderWidth: 1 },
});
