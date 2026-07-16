import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';

const { width: SW } = Dimensions.get('window');

function getTimeDiffLabel(dateStr: string, t: (key: string, opts?: any) => string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 7) return t('workoutTab.daysAgo', { n: days });
  if (days < 30) return t('workoutTab.weeksAgo', { n: Math.floor(days / 7) });
  if (days < 365) return t('workoutTab.monthsAgo', { n: Math.floor(days / 30) });
  const years = Math.floor(days / 365);
  return t('workoutTab.yearsAgo', { n: years });
}

function calcDelta(current: number, previous: number) {
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100) : 0;
  return { diff: Math.round(diff * 10) / 10, pct: Math.round(pct * 10) / 10 };
}

function InBodyModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [weight, setWeight] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  const [bmi, setBmi] = useState('');
  const [bmr, setBmr] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [skeletalMuscle, setSkeletalMuscle] = useState('');

  const fields = [
    { label: t('workoutTab.fieldWeightKg'), value: weight, set: setWeight },
    { label: t('workoutTab.fieldMuscleMassKg'), value: muscleMass, set: setMuscleMass },
    { label: t('workoutTab.fieldBodyFatPct'), value: bodyFat, set: setBodyFat },
    { label: t('workoutTab.fieldBodyWaterPct'), value: bodyWater, set: setBodyWater },
    { label: t('workoutTab.fieldBmi'), value: bmi, set: setBmi },
    { label: t('workoutTab.fieldBmrKcal'), value: bmr, set: setBmr },
    { label: t('workoutTab.fieldVisceralFat'), value: visceralFat, set: setVisceralFat },
    { label: t('workoutTab.fieldSkeletalMusclePct'), value: skeletalMuscle, set: setSkeletalMuscle },
  ];

  const handleSave = () => {
    if (!weight || !bodyFat) {
      Alert.alert(t('workoutTab.alertRequiredTitle'), t('workoutTab.alertRequiredMessage'));
      return;
    }
    onSave({
      date: new Date().toISOString().split('T')[0],
      weight: parseFloat(weight) || 0,
      muscleMass: parseFloat(muscleMass) || 0,
      bodyFat: parseFloat(bodyFat) || 0,
      bodyWater: parseFloat(bodyWater) || 0,
      bmi: parseFloat(bmi) || 0,
      bmr: parseFloat(bmr) || 0,
      visceralFat: parseFloat(visceralFat) || 0,
      skeletalMuscle: parseFloat(skeletalMuscle) || 0,
    });
    setWeight(''); setMuscleMass(''); setBodyFat(''); setBodyWater('');
    setBmi(''); setBmr(''); setVisceralFat(''); setSkeletalMuscle('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('workoutTab.addInBodyTest')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
            {fields.map(f => (
              <View key={f.label}>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            ))}
            <Pressable onPress={handleSave} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.saveBtn}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={s.saveBtnText}>{t('workoutTab.saveTestResults')}</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InBodyTab({ inBodyTests, latestInBody, theme, onAddTest, userHeight }: {
  inBodyTests: any[]; latestInBody: any; theme: any; onAddTest: () => void; userHeight?: number;
}) {
  const { t } = useTranslation();
  // BMI is derivable from weight + height when not entered manually
  const derivedBmi = (latestInBody?.weight && userHeight)
    ? Math.round((latestInBody.weight / Math.pow(userHeight / 100, 2)) * 10) / 10
    : 0;
  const previousInBody = inBodyTests.length > 1 ? inBodyTests[1] : null;

  const findTestAround = (monthsAgo: number) => {
    const target = Date.now() - monthsAgo * 30 * 24 * 3600000;
    const window = 15 * 24 * 3600000;
    return inBodyTests.find((t: any) => {
      const td = new Date(t.date).getTime();
      return Math.abs(td - target) < window;
    }) || null;
  };

  const test3mo = findTestAround(3);
  const test6mo = findTestAround(6);
  const test1yr = findTestAround(12);

  const metrics: { key: string; label: string; icon: string; color: string; unit: string; higherIsBetter: boolean }[] = [
    { key: 'weight', label: t('workoutTab.metricWeight'), icon: 'scale-outline', color: Colors.primary, unit: 'kg', higherIsBetter: false },
    { key: 'bodyFat', label: t('workoutTab.metricBodyFat'), icon: 'pie-chart-outline', color: '#FF6B35', unit: '%', higherIsBetter: false },
    { key: 'muscleMass', label: t('workoutTab.metricMuscleMass'), icon: 'barbell-outline', color: '#4ECDC4', unit: 'kg', higherIsBetter: true },
    { key: 'bmi', label: t('workoutTab.metricBmi'), icon: 'analytics-outline', color: '#FFD93D', unit: '', higherIsBetter: false },
    { key: 'bodyWater', label: t('workoutTab.metricBodyWater'), icon: 'water-outline', color: '#48CAE4', unit: '%', higherIsBetter: true },
    { key: 'bmr', label: t('workoutTab.metricBmr'), icon: 'flame-outline', color: '#E07A5F', unit: 'kcal', higherIsBetter: true },
    { key: 'visceralFat', label: t('workoutTab.metricVisceralFat'), icon: 'heart-outline', color: '#FF4458', unit: '', higherIsBetter: false },
    { key: 'skeletalMuscle', label: t('workoutTab.metricSkeletalMuscle'), icon: 'body-outline', color: Colors.primary, unit: '%', higherIsBetter: true },
  ];

  const getComparisonData = (metricKey: string, higherIsBetter: boolean) => {
    if (!latestInBody || !previousInBody) return null;
    const current = latestInBody[metricKey] || 0;
    const prev = previousInBody[metricKey] || 0;
    if (prev === 0) return null;
    const { diff, pct } = calcDelta(current, prev);
    const improved = higherIsBetter ? diff > 0 : diff < 0;
    return { diff, pct, improved, unchanged: diff === 0 };
  };

  const getTrendInsights = () => {
    if (!latestInBody) return [];
    const insights: { icon: string; color: string; text: string; type: 'positive' | 'warning' | 'info' }[] = [];

    if (previousInBody) {
      const fatDelta = calcDelta(latestInBody.bodyFat, previousInBody.bodyFat);
      const muscleDelta = calcDelta(latestInBody.muscleMass, previousInBody.muscleMass);
      if (fatDelta.diff < 0 && muscleDelta.diff > 0) {
        insights.push({ icon: 'trophy', color: '#FFD93D', text: t('workoutTab.bcGreatProgress', { fat: Math.abs(fatDelta.diff), muscle: muscleDelta.diff }), type: 'positive' });
      } else if (fatDelta.diff < 0) {
        insights.push({ icon: 'trending-down', color: Colors.primary, text: t('workoutTab.bcFatDecreased', { fat: Math.abs(fatDelta.diff) }), type: 'positive' });
      } else if (fatDelta.diff > 0) {
        insights.push({ icon: 'alert-circle', color: '#FF6B35', text: t('workoutTab.bcFatIncreased', { fat: fatDelta.diff }), type: 'warning' });
      }
      if (muscleDelta.diff > 0) {
        insights.push({ icon: 'barbell', color: '#4ECDC4', text: t('workoutTab.bcMuscleUp', { muscle: muscleDelta.diff }), type: 'positive' });
      } else if (muscleDelta.diff < -0.5) {
        insights.push({ icon: 'warning', color: '#FF4458', text: t('workoutTab.bcMuscleDropped', { muscle: Math.abs(muscleDelta.diff) }), type: 'warning' });
      }
    }

    if (test1yr) {
      const yearFatDelta = calcDelta(latestInBody.bodyFat, test1yr.bodyFat);
      const yearMuscleDelta = calcDelta(latestInBody.muscleMass, test1yr.muscleMass);
      if (yearFatDelta.diff < 0 || yearMuscleDelta.diff > 0) {
        const fragFat = yearFatDelta.diff < 0 ? t('workoutTab.bcFragLessFat', { fat: Math.abs(yearFatDelta.diff) }) : '';
        const fragMuscle = yearMuscleDelta.diff > 0 ? t('workoutTab.bcFragMoreMuscle', { muscle: yearMuscleDelta.diff }) : '';
        const sep = yearFatDelta.diff < 0 && yearMuscleDelta.diff > 0 ? t('workoutTab.bcFragSeparator') : '';
        insights.push({ icon: 'calendar', color: '#48CAE4', text: t('workoutTab.bcComparedToYear', { detail: `${fragFat}${sep}${fragMuscle}` }), type: 'positive' });
      } else if (yearFatDelta.diff > 0 && yearMuscleDelta.diff < 0) {
        insights.push({ icon: 'calendar', color: '#FF6B35', text: t('workoutTab.bcBetterYearAgo', { fat: Math.abs(yearFatDelta.diff), muscle: Math.abs(yearMuscleDelta.diff) }), type: 'warning' });
      }
    }

    if (test6mo && !test1yr) {
      const delta6 = calcDelta(latestInBody.bodyFat, test6mo.bodyFat);
      if (delta6.diff < 0) {
        insights.push({ icon: 'time', color: Colors.primary, text: t('workoutTab.bcBetter6Months', { fat: Math.abs(delta6.diff) }), type: 'positive' });
      }
    }

    if (test3mo && !test6mo && !test1yr) {
      const delta3 = calcDelta(latestInBody.bodyFat, test3mo.bodyFat);
      if (delta3.diff < 0) {
        insights.push({ icon: 'time', color: Colors.primary, text: t('workoutTab.bcImproved3Months', { fat: Math.abs(delta3.diff) }), type: 'positive' });
      }
    }

    if (insights.length === 0 && inBodyTests.length === 1) {
      insights.push({ icon: 'information-circle', color: '#48CAE4', text: t('workoutTab.bcAddMoreTests'), type: 'info' });
    }

    return insights;
  };

  const trendInsights = getTrendInsights();

  return (
    <View>
      <View style={[s.inbodyHeader, { backgroundColor: theme.card }]}>
        <LinearGradient colors={['#48CAE4', '#0077B6']} style={s.insightsIcon}>
          <Ionicons name="body" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[s.insightsTitle, { color: theme.text }]}>{t('workoutTab.inbodyAnalysis')}</Text>
          <Text style={[s.insightsSub, { color: theme.textMuted }]}>
            {inBodyTests.length > 0 ? t('workoutTab.testsRecorded', { n: inBodyTests.length }) : t('workoutTab.trackBodyComposition')}
          </Text>
        </View>
        <Pressable
          onPress={onAddTest}
          style={({ pressed }) => [s.addTestBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.addTestBtnGrad}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.addTestBtnText}>{t('workoutTab.addTest')}</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {latestInBody ? (
        <View>
          <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.latestResults')}</Text>
          <View style={s.inbodyGrid}>
            {metrics.map((item, i) => {
              let val = latestInBody[item.key];
              if (item.key === 'bmi' && (!val || val === 0) && derivedBmi) val = derivedBmi;
              const has = val != null && val !== 0;
              const comp = getComparisonData(item.key, item.higherIsBetter);
              return (
                <Animated.View key={item.label} entering={FadeInDown.duration(300).delay(i * 50)} style={s.inbodyStatWrap}>
                  <View style={[s.inbodyStat, { backgroundColor: theme.card }]}>
                    <View style={[s.inbodyStatIcon, { backgroundColor: item.color + '15' }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <Text style={[s.inbodyStatValue, { color: has ? theme.text : theme.textMuted }]}>
                      {has ? `${val}${item.unit && item.key !== 'bmr' ? item.unit : ''}` : '—'}
                    </Text>
                    <Text style={[s.inbodyStatLabel, { color: theme.textMuted }]}>{item.label}</Text>
                    {comp && !comp.unchanged && (
                      <View style={[s.deltaRow, { backgroundColor: comp.improved ? '#00C89615' : '#FF445815' }]}>
                        <Ionicons
                          name={comp.improved ? 'arrow-up' : 'arrow-down'}
                          size={10}
                          color={comp.improved ? '#00C896' : '#FF4458'}
                        />
                        <Text style={[s.deltaText, { color: comp.improved ? '#00C896' : '#FF4458' }]}>
                          {Math.abs(comp.diff)}{item.unit}
                        </Text>
                      </View>
                    )}
                    {comp && comp.unchanged && (
                      <View style={[s.deltaRow, { backgroundColor: '#FFD93D15' }]}>
                        <Ionicons name="remove" size={10} color="#FFD93D" />
                        <Text style={[s.deltaText, { color: '#FFD93D' }]}>{t('workoutTab.noChange')}</Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })}
          </View>
          <Text style={[s.inbodyDate, { color: theme.textMuted }]}>{t('workoutTab.recorded', { date: latestInBody.date })}</Text>

          {trendInsights.length > 0 && (
            <View>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.aiInsights')}</Text>
              {trendInsights.map((insight, i) => (
                <Animated.View key={i} entering={FadeInDown.duration(350).delay(i * 70)}>
                  <View style={[s.insightCard, { backgroundColor: theme.card }]}>
                    <View style={[s.insightIcon, { backgroundColor: insight.color + '18' }]}>
                      <Ionicons name={insight.icon as any} size={20} color={insight.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.insightText, { color: theme.textSecondary }]}>{insight.text}</Text>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}

          {inBodyTests.length > 1 && (
            <View>
              <Text style={[s.sectionTitle, { color: theme.text }]}>{t('workoutTab.testHistory')}</Text>
              {inBodyTests.slice(0, 8).map((test: any, i: number) => {
                const isLatest = i === 0;
                const prevTest = i < inBodyTests.length - 1 ? inBodyTests[i + 1] : null;
                const weightDelta = prevTest ? calcDelta(test.weight, prevTest.weight) : null;
                const fatDelta = prevTest ? calcDelta(test.bodyFat, prevTest.bodyFat) : null;
                const muscleDelta = prevTest ? calcDelta(test.muscleMass, prevTest.muscleMass) : null;
                return (
                  <Animated.View key={test.id} entering={FadeInRight.duration(300).delay(i * 60)}>
                    <View style={[s.historyCard, { backgroundColor: theme.card, borderColor: isLatest ? Colors.primary + '40' : 'transparent', borderWidth: isLatest ? 1 : 0 }]}>
                      <View style={s.historyCardHeader}>
                        <View style={s.historyDateRow}>
                          <Text style={[s.inbodyHistDate, { color: theme.text }]}>{test.date}</Text>
                          {isLatest && (
                            <View style={[s.latestBadge, { backgroundColor: Colors.primary + '20' }]}>
                              <Text style={[s.latestBadgeText, { color: Colors.primary }]}>{t('workoutTab.latest')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[s.historyTimeAgo, { color: theme.textMuted }]}>{getTimeDiffLabel(test.date, t)}</Text>
                      </View>
                      <View style={s.historyMetrics}>
                        <View style={s.historyMetric}>
                          <Text style={[s.historyMetricVal, { color: theme.text }]}>{test.weight}kg</Text>
                          {weightDelta && weightDelta.diff !== 0 && (
                            <View style={s.historyDeltaRow}>
                              <Ionicons name={weightDelta.diff < 0 ? 'caret-down' : 'caret-up'} size={10} color={weightDelta.diff < 0 ? '#00C896' : '#FF4458'} />
                              <Text style={{ fontSize: 10, fontFamily: 'Rubik_500Medium', color: weightDelta.diff < 0 ? '#00C896' : '#FF4458' }}>{Math.abs(weightDelta.diff)}</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.historyMetric}>
                          <Text style={[s.historyMetricVal, { color: '#FF6B35' }]}>{test.bodyFat}%</Text>
                          {fatDelta && fatDelta.diff !== 0 && (
                            <View style={s.historyDeltaRow}>
                              <Ionicons name={fatDelta.diff < 0 ? 'caret-down' : 'caret-up'} size={10} color={fatDelta.diff < 0 ? '#00C896' : '#FF4458'} />
                              <Text style={{ fontSize: 10, fontFamily: 'Rubik_500Medium', color: fatDelta.diff < 0 ? '#00C896' : '#FF4458' }}>{Math.abs(fatDelta.diff)}%</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.historyMetric}>
                          <Text style={[s.historyMetricVal, { color: '#4ECDC4' }]}>{test.muscleMass}kg</Text>
                          {muscleDelta && muscleDelta.diff !== 0 && (
                            <View style={s.historyDeltaRow}>
                              <Ionicons name={muscleDelta.diff > 0 ? 'caret-up' : 'caret-down'} size={10} color={muscleDelta.diff > 0 ? '#00C896' : '#FF4458'} />
                              <Text style={{ fontSize: 10, fontFamily: 'Rubik_500Medium', color: muscleDelta.diff > 0 ? '#00C896' : '#FF4458' }}>{Math.abs(muscleDelta.diff)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}

              {(() => {
                const oldest = inBodyTests[inBodyTests.length - 1];
                if (!oldest || inBodyTests.length < 2) return null;
                const wDelta = calcDelta(latestInBody.weight, oldest.weight);
                const fDelta = calcDelta(latestInBody.bodyFat, oldest.bodyFat);
                const mDelta = calcDelta(latestInBody.muscleMass, oldest.muscleMass);
                return (
                  <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                    <LinearGradient colors={[Colors.primary + '15', '#48CAE415']} style={s.totalProgressCard}>
                      <View style={s.totalProgressHeader}>
                        <Ionicons name="analytics" size={20} color={Colors.primary} />
                        <Text style={[s.totalProgressTitle, { color: theme.text }]}>{t('workoutTab.totalJourney')}</Text>
                        <Text style={[s.totalProgressSub, { color: theme.textMuted }]}>{t('workoutTab.since', { date: oldest.date })}</Text>
                      </View>
                      <View style={s.totalProgressRow}>
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.metricWeight')}</Text>
                          <Text style={[s.totalProgressValue, { color: wDelta.diff <= 0 ? '#00C896' : '#FF6B35' }]}>
                            {wDelta.diff > 0 ? '+' : ''}{wDelta.diff}kg
                          </Text>
                        </View>
                        <View style={[s.totalProgressDivider, { backgroundColor: theme.border }]} />
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.metricBodyFat')}</Text>
                          <Text style={[s.totalProgressValue, { color: fDelta.diff <= 0 ? '#00C896' : '#FF4458' }]}>
                            {fDelta.diff > 0 ? '+' : ''}{fDelta.diff}%
                          </Text>
                        </View>
                        <View style={[s.totalProgressDivider, { backgroundColor: theme.border }]} />
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.muscleShort')}</Text>
                          <Text style={[s.totalProgressValue, { color: mDelta.diff >= 0 ? '#00C896' : '#FF4458' }]}>
                            {mDelta.diff > 0 ? '+' : ''}{mDelta.diff}kg
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                );
              })()}
            </View>
          )}
        </View>
      ) : (
        <View style={[s.emptyCard, { backgroundColor: theme.card, marginTop: 16 }]}>
          <Ionicons name="body-outline" size={48} color={theme.textMuted} />
          <Text style={[s.emptyTitle, { color: theme.textMuted }]}>{t('workoutTab.noInbodyTests')}</Text>
          <Text style={[s.emptySub, { color: theme.textMuted }]}>{t('workoutTab.noInbodyTestsSub')}</Text>
          <Pressable
            onPress={onAddTest}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginTop: 12 }]}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.emptyBtn}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.emptyBtnText}>{t('workoutTab.addFirstTest')}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function InBodySection() {
  const { isDark, inBodyTests, addInBodyTest, user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [showInBodyModal, setShowInBodyModal] = useState(false);

  const latestInBody = inBodyTests.length > 0 ? inBodyTests[0] : null;

  const handleSaveInBody = (data: any) => {
    addInBodyTest(data);
    setShowInBodyModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View>
      <InBodyTab
        inBodyTests={inBodyTests}
        latestInBody={latestInBody}
        theme={theme}
        userHeight={user?.height}
        onAddTest={() => { setShowInBodyModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      />
      <InBodyModal visible={showInBodyModal} onClose={() => setShowInBodyModal(false)} onSave={handleSaveInBody} />
    </View>
  );
}

const s = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold', paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  emptyCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
  emptySub: { fontSize: 13, fontFamily: 'Rubik_400Regular', textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20,
    paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  insightsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: 17, fontFamily: 'Rubik_600SemiBold' },
  insightsSub: { fontSize: 12, fontFamily: 'Rubik_400Regular', marginTop: 2 },
  insightCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insightText: { fontSize: 13, fontFamily: 'Rubik_400Regular', lineHeight: 19 },
  inbodyHeader: {
    marginHorizontal: 20, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4,
  },
  addTestBtn: {},
  addTestBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addTestBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  inbodyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  inbodyStatWrap: { width: (SW - 50) / 2 },
  inbodyStat: { borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
  inbodyStatIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inbodyStatValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  inbodyStatLabel: { fontSize: 11, fontFamily: 'Rubik_500Medium' },
  inbodyDate: { fontSize: 12, fontFamily: 'Rubik_400Regular', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  inbodyHistDate: { fontSize: 13, fontFamily: 'Rubik_600SemiBold' },
  deltaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4,
  },
  deltaText: { fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  historyCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14,
  },
  historyCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  latestBadgeText: { fontSize: 10, fontFamily: 'Rubik_600SemiBold' },
  historyTimeAgo: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  historyMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  historyMetric: { alignItems: 'center', gap: 2 },
  historyMetricVal: { fontSize: 14, fontFamily: 'Rubik_600SemiBold' },
  historyDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  totalProgressCard: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16,
  },
  totalProgressHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  totalProgressTitle: { fontSize: 15, fontFamily: 'Rubik_600SemiBold' },
  totalProgressSub: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  totalProgressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  totalProgressItem: { alignItems: 'center', gap: 4 },
  totalProgressLabel: { fontSize: 11, fontFamily: 'Rubik_400Regular' },
  totalProgressValue: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  totalProgressDivider: { width: 1, height: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '85%' },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: 'Rubik_700Bold' },
  fieldLabel: { fontSize: 13, fontFamily: 'Rubik_500Medium', marginBottom: 6 },
  fieldInput: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: 'Rubik_500Medium', borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Rubik_600SemiBold' },
});
