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
import { Fonts, Type } from '@/constants/typography';
import { Display, HeroCard, Chip, SectionHeader, Button, EmptyState } from '@/components/ui';
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 + 16 : insets.top + 8 }]}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); back(); }} style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{gym.name}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
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

        {(gym.lat != null && gym.lng != null || !!gym.whatsapp) && (
          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.actionRow}>
            {gym.lat != null && gym.lng != null && (
              <Chip label={t('discover.directions')} icon="navigate-outline" onPress={handleDirections} />
            )}
            {!!gym.whatsapp && (
              <Chip label={t('discover.whatsapp')} icon="logo-whatsapp" onPress={() => Linking.openURL(`https://wa.me/${gym.whatsapp!.replace(/[^0-9]/g, '')}`)} />
            )}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.tabContainer}>
          <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(['info', 'schedule'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable key={tab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab); }}
                  style={[styles.tabButton, isActive && { backgroundColor: Colors.electric }]}>
                  <Ionicons name={tab === 'info' ? 'information-circle-outline' : 'time-outline'} size={16} color={isActive ? '#04120B' : theme.textMuted} />
                  <Text style={[styles.tabText, { color: isActive ? '#04120B' : theme.textMuted }]}>{t(`discover.${tab}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {activeTab === 'info' ? (
          <>
            {!!gym.description && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.info')} />
                <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>{gym.description}</Text>
              </View>
            )}

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

            {gym.facilities.length > 0 && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.facilities')} />
                <View style={styles.chipWrap}>
                  {gym.facilities.map((facility) => (
                    <Chip key={facility.id} label={facility.title} icon={(facility.icon || 'checkmark-circle-outline') as any} />
                  ))}
                </View>
              </View>
            )}

            {!!gym.coaches?.length && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.coaches')} />
                <View style={styles.coachRow}>
                  {gym.coaches.map((co) => (
                    <Pressable key={co.id} onPress={() => router.push(`/coach-profile/${co.id}` as any)} style={[styles.coachCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      {co.avatarUrl
                        ? <Image source={{ uri: co.avatarUrl }} style={styles.coachAvatar} />
                        : <View style={[styles.coachAvatar, { backgroundColor: Colors.electric + '20', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="person" size={20} color={Colors.electric} /></View>}
                      <Text style={[styles.coachName, { color: theme.text }]} numberOfLines={1}>{co.name}</Text>
                      {co.id === gym.headCoachId && <View style={[styles.headCoachBadge, { backgroundColor: Colors.electric + '20' }]}><Ionicons name="ribbon" size={10} color={Colors.electric} /><Text style={styles.headCoachText}>{t('discover.head_coach')}</Text></View>}
                      <Text style={[styles.coachHeadline, { color: theme.textMuted }]} numberOfLines={1}>{co.headline}</Text>
                      <View style={styles.coachRating}><Ionicons name="star" size={11} color="#FFD700" /><Text style={[styles.coachRatingText, { color: theme.textSecondary }]}>{co.rating}</Text></View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {classes.length > 0 && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.classes')} />
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
                          style={[styles.classJoinBtn, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.myStatus === 'enrolled' ? Colors.electric : c.myStatus ? theme.background : full ? theme.background : Colors.electric + '20', borderColor: Colors.electric, borderWidth: c.myStatus === 'enrolled' ? 0 : 1 }]}>
                          <Text style={[styles.classJoinText, { color: c.myStatus === 'enrolled' ? '#04120B' : full || c.myStatus ? theme.textMuted : Colors.electric }]}>{label}</Text>
                          {cCancelable && <Ionicons name="close" size={12} color={c.myStatus === 'enrolled' ? '#04120B' : theme.textMuted} />}
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
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

            {gym.subscriptions.length > 0 && (
              <View style={styles.block}>
                <SectionHeader title={t('discover.membership_plans')} />
                {gym.subscriptions.map((sub) => (
                  <View key={sub.name} style={[styles.subCard, { backgroundColor: theme.card }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subName, { color: theme.text }]}>{sub.name}</Text>
                      <View style={styles.subPriceRow}>
                        <Text style={[styles.subPrice, { color: Colors.electric }]}>{sub.price.amount}</Text>
                        <Text style={[styles.subCurrency, { color: theme.textSecondary }]}> {sub.price.currency}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleJoin(sub.name)} style={[styles.subscribeBtn, { opacity: manages || isMember ? 0.5 : 1 }]} disabled={manages || isMember}>
                      <Text style={styles.subscribeBtnText}>{manages ? '—' : isMember ? t('discover.member') : isPending ? t('discover.cancel_request') : t('discover.subscribe')}</Text>
                    </Pressable>
                  </View>
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

            {!!gym.phone && (
              <View style={[styles.contactCard, { backgroundColor: theme.card }]}>
                <View style={styles.contactRow}>
                  <View style={[styles.hoursIcon, { backgroundColor: Colors.electric + '18' }]}>
                    <Ionicons name="call-outline" size={18} color={Colors.electric} />
                  </View>
                  <Text style={[styles.contactPhone, { color: theme.text }]}>{gym.phone}</Text>
                </View>
                <Pressable onPress={handleCall} style={styles.callBtn}><Ionicons name="call" size={18} color="#04120B" /></Pressable>
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
                  <View style={[styles.hoursPill, { backgroundColor: Colors.electric + '14' }]}>
                    <Ionicons name="time-outline" size={12} color={Colors.electric} />
                    <Text style={[styles.hoursPillText, { color: Colors.electric }]}>{item.open} – {item.close}</Text>
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
                        <View style={[styles.classBar, { backgroundColor: Colors.electric }]} />
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
              <EmptyState icon="calendar-outline" title="—" />
            </View>
          )
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.background, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 12, borderTopColor: theme.border }]}>
        {manages ? (
          <View style={[styles.managePill, { backgroundColor: theme.card }]}>
            <Ionicons name="shield-checkmark" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.manageText, { color: theme.textMuted }]}>{t('discover.you_manage_gym')}</Text>
          </View>
        ) : (
          <Button
            variant="solid"
            label={isMember ? t('discover.member') : isPending ? t('discover.cancel_request') : t('discover.join_now')}
            icon={isMember ? 'checkmark' : isPending ? 'close-circle' : 'flash'}
            onPress={() => handleJoin()}
            disabled={isMember}
            style={isPending ? { backgroundColor: Colors.semantic.danger } : isMember ? { backgroundColor: theme.cardAlt } : undefined}
          />
        )}
      </View>

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

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },

  tabContainer: { marginBottom: 20 },
  tabBar: { flexDirection: 'row', borderRadius: 999, padding: 4, borderWidth: 1 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999 },
  tabText: { fontSize: 14, fontFamily: Fonts.semibold },

  block: { marginBottom: 24 },
  descriptionText: { fontSize: 14, fontFamily: Fonts.regular, lineHeight: 22 },

  hoursCard: { borderRadius: 16, padding: 14, marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hoursLabel: { fontSize: 12, fontFamily: Fonts.regular, marginBottom: 2 },
  hoursValue: { fontSize: 15, fontFamily: Fonts.semibold },

  mapCard: { height: 120, borderRadius: 16, overflow: 'hidden', marginBottom: 24, justifyContent: 'flex-end' },
  mapPin: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -26, width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.electric, alignItems: 'center', justifyContent: 'center' },
  mapFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  mapAddr: { flex: 1, fontFamily: Fonts.medium, fontSize: 13, color: '#E6F5EE' },
  mapDirBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.electric, borderRadius: 999, paddingHorizontal: 12, height: 30 },
  mapDirText: { fontFamily: Fonts.bold, fontSize: 12, color: '#04120B' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  coachRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  coachCard: { width: '47%', flexBasis: '47%', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
  coachAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 4 },
  coachName: { fontSize: 13, fontFamily: Fonts.semibold },
  headCoachBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  headCoachText: { fontSize: 9, fontFamily: Fonts.semibold, color: Colors.electric },
  coachHeadline: { fontSize: 10, fontFamily: Fonts.regular, textAlign: 'center' },
  coachRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coachRatingText: { fontSize: 11, fontFamily: Fonts.medium },

  classCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10 },
  clsTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  classMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  classMeta: { fontSize: 12, fontFamily: Fonts.regular },
  clsCoach: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 4 },
  classJoinBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  classJoinText: { fontSize: 12, fontFamily: Fonts.semibold },

  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 10 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventName: { fontSize: 15, fontFamily: Fonts.semibold },
  eventMeta: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },

  subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, marginBottom: 10 },
  subName: { fontSize: 15, fontFamily: Fonts.semibold, marginBottom: 4 },
  subPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  subPrice: { fontSize: 20, fontFamily: Fonts.monoBold },
  subCurrency: { fontSize: 13, fontFamily: Fonts.regular },
  subscribeBtn: { borderWidth: 1.5, borderColor: Colors.electric, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  subscribeBtnText: { color: Colors.electric, fontSize: 13, fontFamily: Fonts.semibold },

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

  contactCard: { borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contactPhone: { fontSize: 15, fontFamily: Fonts.medium },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.electric, justifyContent: 'center', alignItems: 'center' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  managePill: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 999 },
  manageText: { fontSize: 15, fontFamily: Fonts.semibold },

  emptyTabContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

  scheduleCard: { borderRadius: 16, padding: 16, marginBottom: 10 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleDay: { fontSize: 16, fontFamily: Fonts.semibold },
  hoursPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  hoursPillText: { fontSize: 12, fontFamily: Fonts.semibold },
  closedText: { fontSize: 12, fontFamily: Fonts.medium },
  classList: { marginTop: 10, gap: 2 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  classTimeCol: { width: 64 },
  classTime: { fontSize: 13, fontFamily: Fonts.semibold },
  classDuration: { fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 },
  classBar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  className: { fontSize: 14, fontFamily: Fonts.medium },
  classCoachRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  classCoach: { fontSize: 11, fontFamily: Fonts.regular },
  noClasses: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 8 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  ratePicker: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 12 },
  reviewInput: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.regular, height: 100, textAlignVertical: 'top', marginBottom: 14, borderWidth: 1 },
});
