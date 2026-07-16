import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Linking, ActivityIndicator, Image, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { gymsApi, classesApi, reviewsApi, type ApiGym, type ClassItem, type GymReview } from '@/src/features/gyms/api';
import { eventsApi, type ApiEvent } from '@/src/features/events/api';

export default function GymProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<'info' | 'schedule'>('info');
  const [gym, setGym] = useState<ApiGym | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [requested, setRequested] = useState(false);
  const [membership, setMembership] = useState<'member' | 'pending' | null>(null);
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
    gymsApi.myGyms().then(list => {
      const mine = list.find(x => x.gymId === String(id));
      if (active && mine) setMembership(mine.kind === 'membership' && mine.status === 'active' ? 'member' : 'pending');
    }).catch(() => {});
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

  // joined = active member; pending = a request awaiting approval (cancellable)
  const isMember = membership === 'member';
  const isPending = membership === 'pending' || requested;
  const locked = isMember || isPending; // can't send a new request while member/pending

  const back = () => (router.canGoBack() ? router.back() : router.replace('/events'));
  const handleCall = () => { if (gym?.phone) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Linking.openURL(`tel:${gym.phone}`); } };
  const handleDirections = () => {
    if (gym?.lat == null || gym?.lng == null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${gym.lat},${gym.lng}`);
  };
  // join/subscribe — records a pending request (no payment until P8); tapping
  // again while pending cancels (rolls back) the request.
  const handleJoin = (plan?: string) => {
    if (!gym || manages || isMember) return; // owner/manager or active member can't request
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isPending) {
      setRequested(false); setMembership(null);
      gymsApi.cancelJoin(gym.id).catch(() => setMembership('pending'));
    } else {
      setRequested(true);
      gymsApi.join(gym.id, plan).catch(() => setRequested(false));
    }
  };

  if (status !== 'ok' || !gym) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
          <Pressable onPress={back} style={styles.backBtn}><Ionicons name="chevron-back" size={24} color={theme.text} /></Pressable>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          {status === 'loading'
            ? <ActivityIndicator color={Colors.primary} />
            : <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('discover.not_found')}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); back(); }} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{gym.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}>
        {!!gym.coverUrl && (
          <Image source={{ uri: gym.coverUrl }} style={styles.cover} resizeMode="cover" />
        )}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          {gym.logoUrl ? (
            <Image source={{ uri: gym.logoUrl }} style={styles.avatarCircle} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.avatarCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="barbell" size={36} color="#fff" />
            </LinearGradient>
          )}
          <Text style={[styles.gymName, { color: theme.text }]}>{gym.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.addressText, { color: theme.textSecondary }]}>{gym.address}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Ionicons name="star" size={14} color="#FFD700" /><Text style={[styles.metaText, { color: theme.text }]}>{gym.rating}</Text></View>
            <View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} />
            <View style={styles.metaItem}><Ionicons name="people-outline" size={14} color={theme.textSecondary} /><Text style={[styles.metaText, { color: theme.textSecondary }]}>{gym.memberCount} {t('discover.members')}</Text></View>
          </View>
          <View style={styles.heroActions}>
            {gym.lat != null && gym.lng != null && (
              <Pressable onPress={handleDirections} style={[styles.directionsBtn, { borderColor: Colors.primary }]}>
                <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                <Text style={[styles.directionsText, { color: Colors.primary }]}>{t('discover.directions')}</Text>
              </Pressable>
            )}
            {!!gym.whatsapp && (
              <Pressable onPress={() => Linking.openURL(`https://wa.me/${gym.whatsapp!.replace(/[^0-9]/g, '')}`)} style={[styles.directionsBtn, { borderColor: '#25D36680', backgroundColor: '#25D36618' }]}>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={[styles.directionsText, { color: '#25D366' }]}>{t('discover.whatsapp')}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={[styles.tabBar, { backgroundColor: theme.card }]}>
          {(['info', 'schedule'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable key={tab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}
                style={[styles.tabItem, isActive && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}>
                <Ionicons name={tab === 'info' ? 'information-circle-outline' : 'time-outline'} size={18} color={isActive ? Colors.primary : theme.textMuted} />
                <Text style={[styles.tabText, { color: isActive ? Colors.primary : theme.textMuted }]}>{t(`discover.${tab}`)}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {activeTab === 'info' ? (
          <>
            {!!gym.description && <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{gym.description}</Text>}

            {!!gym.workingHours && (
              <View style={[styles.hoursCard, { backgroundColor: theme.card }]}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.hoursLabel, { color: theme.textSecondary }]}>{t('discover.working_hours')}</Text>
                  <Text style={[styles.hoursValue, { color: theme.text }]}>{gym.workingHours}</Text>
                </View>
              </View>
            )}

            {gym.facilities.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.facilities')}</Text>
                <View style={styles.facilitiesGrid}>
                  {gym.facilities.map((facility) => (
                    <View key={facility.id} style={[styles.facilityCard, { backgroundColor: theme.card }]}>
                      {facility.logoUrl ? (
                        <Image source={{ uri: facility.logoUrl }} style={styles.facilityLogo} resizeMode="cover" />
                      ) : (
                        <View style={[styles.facilityIconWrap, { backgroundColor: Colors.primary + '1A' }]}>
                          <Ionicons name={(facility.icon || 'checkmark-circle-outline') as any} size={20} color={Colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.facilityName, { color: theme.text }]} numberOfLines={1}>{facility.title}</Text>
                        {!!facility.description && <Text style={[styles.facilityDesc, { color: theme.textMuted }]} numberOfLines={2}>{facility.description}</Text>}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {!!gym.coaches?.length && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.coaches')}</Text>
                <View style={styles.coachRow}>
                  {gym.coaches.map((co) => (
                    <Pressable key={co.id} onPress={() => router.push(`/coach-profile/${co.id}` as any)} style={[styles.coachCard, { backgroundColor: theme.card }]}>
                      {co.avatarUrl
                        ? <Image source={{ uri: co.avatarUrl }} style={styles.coachAvatar} />
                        : <View style={[styles.coachAvatar, { backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={20} color={Colors.primary} /></View>}
                      <Text style={[styles.coachName, { color: theme.text }]} numberOfLines={1}>{co.name}</Text>
                      {co.id === gym.headCoachId && <View style={[styles.headCoachBadge, { backgroundColor: Colors.primary + '20' }]}><Ionicons name="ribbon" size={10} color={Colors.primary} /><Text style={styles.headCoachText}>{t('discover.head_coach')}</Text></View>}
                      <Text style={[styles.coachHeadline, { color: theme.textMuted }]} numberOfLines={1}>{co.headline}</Text>
                      <View style={styles.coachRating}><Ionicons name="star" size={11} color="#FFD700" /><Text style={[styles.coachRatingText, { color: theme.textSecondary }]}>{co.rating}</Text></View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {classes.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.classes')}</Text>
                {classes.map((c) => {
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
                          style={[styles.classJoinBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.myStatus === 'enrolled' ? Colors.primary : c.myStatus ? theme.background : full ? theme.background : Colors.primary + '20', borderColor: Colors.primary, borderWidth: c.myStatus === 'enrolled' ? 0 : 1 }]}>
                          <Text style={[styles.classJoinText, { color: c.myStatus === 'enrolled' ? '#fff' : full || c.myStatus ? theme.textMuted : Colors.primary }]}>{label}</Text>
                          {cCancelable && <Ionicons name="close" size={12} color={c.myStatus === 'enrolled' ? '#fff' : theme.textMuted} />}
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {gymEvents.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.events')}</Text>
                {gymEvents.map((ev) => (
                  <Pressable key={ev.id} onPress={() => router.push(`/event-profile/${ev.id}` as any)} style={[styles.eventCard, { backgroundColor: theme.card }]}>
                    <View style={[styles.eventIcon, { backgroundColor: Colors.primary + '18' }]}><Ionicons name="trophy-outline" size={20} color={Colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.eventName, { color: theme.text }]} numberOfLines={1}>{ev.name}</Text>
                      <Text style={[styles.eventMeta, { color: theme.textMuted }]}>{t(`discover.event_type_${ev.type}`)}{ev.startsAt ? ` · ${new Date(ev.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                  </Pressable>
                ))}
              </>
            )}

            {gym.subscriptions.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('discover.membership_plans')}</Text>
                {gym.subscriptions.map((sub) => (
                  <View key={sub.name} style={[styles.subCard, { backgroundColor: theme.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subName, { color: theme.text }]}>{sub.name}</Text>
                      <View style={styles.subPriceRow}>
                        <Text style={[styles.subPrice, { color: Colors.primary }]}>{sub.price.amount}</Text>
                        <Text style={[styles.subCurrency, { color: theme.textSecondary }]}> {sub.price.currency}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleJoin(sub.name)} style={styles.subscribeBtn} disabled={manages || isMember}>
                      <Text style={styles.subscribeBtnText}>{manages ? '—' : isMember ? t('discover.member') : isPending ? t('discover.cancel_request') : t('discover.subscribe')}</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            <View style={styles.reviewsHead}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>{t('discover.reviews')} {gym.reviewsCount > 0 ? `(${gym.reviewsCount})` : ''}</Text>
              <Pressable onPress={() => setReviewOpen(true)} style={styles.writeReviewBtn}>
                <Ionicons name="create-outline" size={15} color={Colors.primary} />
                <Text style={[styles.writeReviewText, { color: Colors.primary }]}>{reviews.some(r => r.mine) ? t('discover.edit_review') : t('discover.write_review')}</Text>
              </Pressable>
            </View>
            {reviews.length === 0 ? (
              <Text style={[styles.noReviews, { color: theme.textMuted }]}>{t('discover.no_reviews')}</Text>
            ) : reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.card }]}>
                <View style={styles.reviewTop}>
                  {r.userAvatar
                    ? <Image source={{ uri: r.userAvatar }} style={styles.reviewAvatar} />
                    : <View style={[styles.reviewAvatar, { backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={16} color={Colors.primary} /></View>}
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

            {!!gym.phone && (
              <View style={[styles.contactCard, { backgroundColor: theme.card }]}>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={20} color={Colors.primary} />
                  <Text style={[styles.contactPhone, { color: theme.text }]}>{gym.phone}</Text>
                </View>
                <Pressable onPress={handleCall} style={styles.callBtn}><Ionicons name="call" size={18} color="#fff" /></Pressable>
              </View>
            )}
          </>
        ) : (
          gym.schedule.length > 0 ? gym.schedule.map((item, index) => (
            <Animated.View key={item.day} entering={FadeInDown.delay(60 * (index + 1)).duration(400)} style={[styles.scheduleCard, { backgroundColor: theme.card }]}>
              <View style={styles.scheduleHeader}>
                <Text style={[styles.scheduleDay, { color: theme.text }]}>{item.day}</Text>
                {item.closed ? (
                  <View style={[styles.hoursPill, { backgroundColor: theme.background }]}>
                    <Text style={[styles.closedText, { color: theme.textMuted }]}>{t('discover.closed')}</Text>
                  </View>
                ) : (item.open || item.close) ? (
                  <View style={[styles.hoursPill, { backgroundColor: Colors.primary + '14' }]}>
                    <Ionicons name="time-outline" size={12} color={Colors.primary} />
                    <Text style={[styles.hoursPillText, { color: Colors.primary }]}>{item.open} – {item.close}</Text>
                  </View>
                ) : null}
              </View>
              {!item.closed && (
                item.classes.length > 0 ? (
                  <View style={styles.classList}>
                    {item.classes.map((cls, ci) => (
                      <View key={ci} style={[styles.classRow, { borderTopColor: theme.border }]}>
                        <View style={styles.classTimeCol}>
                          <Text style={[styles.classTime, { color: theme.text }]}>{cls.time}</Text>
                          <Text style={[styles.classDuration, { color: theme.textMuted }]}>{cls.duration}</Text>
                        </View>
                        <View style={[styles.classBar, { backgroundColor: Colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.className, { color: theme.text }]}>{cls.name}</Text>
                          {!!cls.coach && (
                            <View style={styles.classCoachRow}>
                              <Ionicons name="person-outline" size={11} color={theme.textMuted} />
                              <Text style={[styles.classCoach, { color: theme.textMuted }]}>{cls.coach}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.noClasses, { color: theme.textMuted }]}>{t('discover.no_classes')}</Text>
                )
              )}
            </Animated.View>
          )) : (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="calendar-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTabText, { color: theme.textSecondary }]}>—</Text>
            </View>
          )
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        {manages ? (
          <View style={[styles.joinGradient, { backgroundColor: theme.card, borderRadius: 14 }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.joinText, { color: theme.textMuted }]}>{t('discover.you_manage_gym')}</Text>
          </View>
        ) : (
          <Pressable onPress={() => handleJoin()} style={styles.joinBtn} disabled={isMember}>
            <LinearGradient colors={isMember ? ['#3a3a44', '#2a2a32'] : isPending ? ['#F87171', '#e05555'] : [Colors.primary, Colors.primaryDark]} style={styles.joinGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name={isMember ? 'checkmark' : isPending ? 'close-circle' : 'flash'} size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.joinText}>{isMember ? t('discover.member') : isPending ? t('discover.cancel_request') : t('discover.join_now')}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      <Modal visible={reviewOpen} transparent animationType="slide" onRequestClose={() => setReviewOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t('discover.rate_gym')}</Text>
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
              style={[styles.reviewInput, { color: theme.text, backgroundColor: theme.card }]}
              value={myComment} onChangeText={setMyComment} multiline placeholder={t('discover.review_placeholder')} placeholderTextColor={theme.textMuted}
            />
            <Pressable onPress={submitReview} disabled={myRating < 1} style={[styles.reviewSubmit, { backgroundColor: Colors.primary, opacity: myRating < 1 ? 0.5 : 1 }]}>
              <Text style={styles.reviewSubmitText}>{t('discover.submit_review')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  scrollContent: { paddingHorizontal: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, fontFamily: 'Rubik_400Regular' },
  cover: { width: '100%', height: 150, borderRadius: 16, marginBottom: -32 },
  heroSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 3, borderColor: '#0A0A0F' },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  directionsText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  gymName: { fontSize: 22, fontFamily: 'Rubik_700Bold', marginBottom: 8, textAlign: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 4 },
  addressText: { fontSize: 14, fontFamily: 'Rubik_400Regular' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  metaDot: { width: 4, height: 4, borderRadius: 2 },
  tabBar: { flexDirection: 'row', borderRadius: 14, marginBottom: 20, overflow: 'hidden' },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  descriptionText: { fontSize: 14, fontFamily: 'Rubik_400Regular', lineHeight: 22, marginBottom: 20 },
  hoursCard: { borderRadius: 14, padding: 16, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursLabel: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginBottom: 2 },
  hoursValue: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  sectionTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold', marginBottom: 14 },
  facilitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  facilityCard: { flexBasis: '47%', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10 },
  facilityIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  facilityLogo: { width: 36, height: 36, borderRadius: 10 },
  facilityName: { fontSize: 13, fontFamily: 'Rubik_500Medium' },
  facilityDesc: { fontSize: 10, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  coachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  coachCard: { width: '47%', flexBasis: '47%', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4 },
  coachAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4 },
  coachName: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  headCoachBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  headCoachText: { fontSize: 9, fontFamily: 'Rubik_600SemiBold', color: Colors.primary },
  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  clsTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  classMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  classMeta: { fontSize: 12, fontFamily: 'Rubik_400Regular' },
  clsCoach: { fontSize: 12, fontFamily: 'Rubik_500Medium', marginTop: 4 },
  classJoinBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  classJoinText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  eventMeta: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  writeReviewText: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  noReviews: { fontSize: 13, fontFamily: 'Rubik_400Regular', paddingVertical: 8 },
  reviewCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17 },
  reviewName: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  reviewStars: { flexDirection: 'row', gap: 2, marginTop: 3 },
  reviewComment: { fontSize: 13, fontFamily: 'Rubik_400Regular', marginTop: 10, lineHeight: 19 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Rubik_700Bold' },
  ratePicker: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  reviewInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Rubik_400Regular', height: 100, textAlignVertical: 'top', marginBottom: 14 },
  reviewSubmit: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  reviewSubmitText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  coachHeadline: { fontSize: 10, fontFamily: 'Rubik_400Regular', textAlign: 'center' },
  coachRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coachRatingText: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 16, marginBottom: 10 },
  subName: { fontSize: 15, fontFamily: 'Rubik_600SemiBold', marginBottom: 4 },
  subPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  subPrice: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  subCurrency: { fontSize: 13, fontFamily: 'Rubik_400Regular' },
  subscribeBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8 },
  subscribeBtnText: { color: Colors.primary, fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  contactCard: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactPhone: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  joinBtn: { borderRadius: 14, overflow: 'hidden' },
  joinGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  joinText: { color: '#fff', fontSize: 17, fontFamily: 'Rubik_700Bold' },
  emptyTabContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTabText: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  scheduleCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleDay: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  hoursPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  hoursPillText: { fontSize: 12, fontFamily: 'Rubik_600SemiBold' },
  closedText: { fontSize: 12, fontFamily: 'Rubik_500Medium' },
  classList: { marginTop: 10, gap: 2 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  classTimeCol: { width: 64 },
  classTime: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  classDuration: { fontSize: 11, fontFamily: 'Rubik_400Regular', marginTop: 1 },
  classBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  className: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  classCoachRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  classCoach: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  noClasses: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 8 },
});
