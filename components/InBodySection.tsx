import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, TextInput, Dimensions, Platform, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import { nutritionApi } from '@/src/features/nutrition/api';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';
import { StatTile, SectionHeader, Button } from '@/components/ui';

const { width: SW } = Dimensions.get('window');

// read a file uri as base64, cross-platform (web blob, native file-system legacy)
async function uriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result).split(',')[1] || '');
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  const FS = require('expo-file-system/legacy');
  return FS.readAsStringAsync(uri, { encoding: 'base64' });
}

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

const numify = (v: any): number | undefined => { const n = Number(v); return Number.isFinite(n) && n !== 0 ? n : undefined; };

// the five InBody segmental regions
const SEG_REGIONS: { key: string; labelKey: string; label: string; side: 'arm' | 'trunk' | 'leg' }[] = [
  { key: 'leftArm', labelKey: 'inbody.segLeftArm', label: 'Left arm', side: 'arm' },
  { key: 'rightArm', labelKey: 'inbody.segRightArm', label: 'Right arm', side: 'arm' },
  { key: 'trunk', labelKey: 'inbody.segTrunk', label: 'Trunk', side: 'trunk' },
  { key: 'leftLeg', labelKey: 'inbody.segLeftLeg', label: 'Left leg', side: 'leg' },
  { key: 'rightLeg', labelKey: 'inbody.segRightLeg', label: 'Right leg', side: 'leg' },
];

// long-tail metrics from the full sheet, shown as a read-only breakdown grid
const DETAIL_METRICS: { key: string; labelKey: string; label: string; unit: string; icon: string }[] = [
  { key: 'fatFreeMass', labelKey: 'inbody.fatFreeMass', label: 'Fat-free mass', unit: 'kg', icon: 'body-outline' },
  { key: 'fatMass', labelKey: 'inbody.fatMass', label: 'Body fat mass', unit: 'kg', icon: 'pie-chart-outline' },
  { key: 'protein', labelKey: 'inbody.protein', label: 'Protein', unit: 'kg', icon: 'egg-outline' },
  { key: 'minerals', labelKey: 'inbody.minerals', label: 'Minerals', unit: 'kg', icon: 'sparkles-outline' },
  { key: 'waistHipRatio', labelKey: 'inbody.whr', label: 'Waist-hip ratio', unit: '', icon: 'ellipse-outline' },
  { key: 'smi', labelKey: 'inbody.smi', label: 'SMI', unit: 'kg/m²', icon: 'stats-chart-outline' },
  { key: 'obesityDegree', labelKey: 'inbody.obesityDegree', label: 'Obesity degree', unit: '%', icon: 'speedometer-outline' },
  { key: 'recommendedCalories', labelKey: 'inbody.recommendedCalories', label: 'Recommended intake', unit: 'kcal', icon: 'restaurant-outline' },
  { key: 'inbodyScore', labelKey: 'inbody.inbodyScore', label: 'InBody score', unit: 'pts', icon: 'trophy-outline' },
  { key: 'targetWeight', labelKey: 'inbody.targetWeight', label: 'Target weight', unit: 'kg', icon: 'flag-outline' },
  { key: 'fatControl', labelKey: 'inbody.fatControl', label: 'Fat control', unit: 'kg', icon: 'remove-circle-outline' },
  { key: 'muscleControl', labelKey: 'inbody.muscleControl', label: 'Muscle control', unit: 'kg', icon: 'add-circle-outline' },
];

// keys that live in `details` (everything the parse returns beyond the core columns)
const DETAIL_KEYS = [...DETAIL_METRICS.map((d) => d.key), 'segmentalLean', 'segmentalFat'];
function pickDetails(r: Record<string, any>): Record<string, any> {
  const d: Record<string, any> = {};
  for (const k of DETAIL_KEYS) if (r[k] != null) d[k] = r[k];
  return d;
}

// Horizontal stacked bar of body mass → Fat / Muscle / Water / Other (kg). Derives
// fat mass from body-fat % when the sheet didn't print it. The signature InBody chart.
function CompositionBar({ test, theme, t }: { test: any; theme: any; t: any }) {
  const details = test?.details || {};
  const weight = numify(test?.weight);
  if (!weight) return null;
  const fat = numify(details.fatMass) ?? (numify(test?.bodyFat) ? Math.round((weight * Number(test.bodyFat) / 100) * 10) / 10 : undefined);
  const muscle = numify(test?.muscleMass);
  const water = numify(test?.bodyWater);
  const known = (fat || 0) + (muscle || 0) + (water || 0);
  const other = known > 0 && known < weight ? Math.round((weight - known) * 10) / 10 : 0;
  const segs = [
    { label: t('workoutTab.metricMuscleMass', { defaultValue: 'Muscle' }), val: muscle, color: Colors.ring.blue },
    { label: t('inbody.compFat', { defaultValue: 'Fat' }), val: fat, color: Colors.accent },
    { label: t('inbody.compWater', { defaultValue: 'Water' }), val: water, color: Colors.ring.green },
    { label: t('inbody.compOther', { defaultValue: 'Other' }), val: other, color: theme.textMuted },
  ].filter((x) => x.val && x.val > 0) as { label: string; val: number; color: string }[];
  if (segs.length < 2) return null;
  const total = segs.reduce((a, x) => a + x.val, 0);
  return (
    <View style={[s.chartCard, { backgroundColor: theme.card }]}>
      <Text style={[s.chartTitle, { color: theme.text }]}>{t('inbody.composition', { defaultValue: 'Body composition' })}</Text>
      <View style={s.compBar}>
        {segs.map((x, i) => (
          <View key={i} style={{ flex: x.val / total, backgroundColor: x.color, height: '100%' }} />
        ))}
      </View>
      <View style={s.compLegend}>
        {segs.map((x, i) => (
          <View key={i} style={s.compLegendItem}>
            <View style={[s.compDot, { backgroundColor: x.color }]} />
            <Text style={[s.compLegendLabel, { color: theme.textSecondary }]}>{x.label}</Text>
            <Text style={[s.compLegendVal, { color: theme.text }]}>{x.val}kg</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Segmental lean-mass bars (5 regions). Highlights left/right & upper/lower balance.
function SegmentalBars({ seg, theme, t, title }: { seg: any; theme: any; t: any; title: string }) {
  if (!seg) return null;
  const rows = SEG_REGIONS.map((r) => ({ ...r, val: numify(seg[r.key]) })).filter((r) => r.val);
  if (rows.length < 2) return null;
  const max = Math.max(...rows.map((r) => r.val as number));
  const colorFor = (side: string) => side === 'trunk' ? Colors.electric : side === 'arm' ? Colors.ring.blue : Colors.ring.amber;
  return (
    <View style={[s.chartCard, { backgroundColor: theme.card }]}>
      <Text style={[s.chartTitle, { color: theme.text }]}>{title}</Text>
      {rows.map((r) => (
        <View key={r.key} style={s.segRow}>
          <Text style={[s.segLabel, { color: theme.textSecondary }]}>{t(r.labelKey, { defaultValue: r.label })}</Text>
          <View style={[s.segTrack, { backgroundColor: theme.cardAlt }]}>
            <View style={[s.segFill, { width: `${Math.round(((r.val as number) / max) * 100)}%`, backgroundColor: colorFor(r.side) }]} />
          </View>
          <Text style={[s.segVal, { color: theme.text }]}>{r.val}kg</Text>
        </View>
      ))}
    </View>
  );
}

// Read-only grid of every extra metric detected on the sheet.
function DetailGrid({ details, theme, t }: { details: any; theme: any; t: any }) {
  if (!details) return null;
  const items = DETAIL_METRICS.filter((m) => numify(details[m.key]) != null);
  if (!items.length) return null;
  const fmt = (m: typeof DETAIL_METRICS[number], v: number) =>
    (m.key === 'fatControl' || m.key === 'muscleControl') ? `${v > 0 ? '+' : ''}${v}${m.unit}` : `${v}${m.unit}`;
  return (
    <View style={[s.chartCard, { backgroundColor: theme.card }]}>
      <Text style={[s.chartTitle, { color: theme.text }]}>{t('inbody.fullBreakdown', { defaultValue: 'Full breakdown' })}</Text>
      <View style={s.detailGrid}>
        {items.map((m) => (
          <View key={m.key} style={[s.detailItem, { borderColor: theme.border }]}>
            <Ionicons name={m.icon as any} size={15} color={Colors.electric} />
            <Text style={[s.detailVal, { color: theme.text }]} numberOfLines={1}>{fmt(m, Number(details[m.key]))}</Text>
            <Text style={[s.detailLabel, { color: theme.textMuted }]} numberOfLines={1}>{t(m.labelKey, { defaultValue: m.label })}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// numeric field keys shown in the review card (date handled separately)
const REVIEW_FIELDS: { key: string; labelKey: string; unit: string }[] = [
  { key: 'weight', labelKey: 'workoutTab.fieldWeightKg', unit: 'kg' },
  { key: 'skeletalMuscle', labelKey: 'workoutTab.fieldSkeletalMusclePct', unit: '' },
  { key: 'muscleMass', labelKey: 'workoutTab.fieldMuscleMassKg', unit: 'kg' },
  { key: 'bodyFat', labelKey: 'workoutTab.fieldBodyFatPct', unit: '%' },
  { key: 'bodyWater', labelKey: 'workoutTab.fieldBodyWaterPct', unit: '' },
  { key: 'bmi', labelKey: 'workoutTab.fieldBmi', unit: '' },
  { key: 'bmr', labelKey: 'workoutTab.fieldBmrKcal', unit: 'kcal' },
  { key: 'visceralFat', labelKey: 'workoutTab.fieldVisceralFat', unit: '' },
];

// Upload a photo/PDF of an InBody sheet → AI reads it → the user reviews EVERY
// detected value ("what we'll save"), fixes any mistakes, then Commits. There is
// no blank manual form: correcting the parsed result is the only entry path.
function InBodyUploadModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;

  type Stage = 'upload' | 'parsing' | 'review';
  const [stage, setStage] = useState<Stage>('upload');
  const [error, setError] = useState('');
  const [previewUri, setPreviewUri] = useState<string | undefined>();
  const [date, setDate] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [details, setDetails] = useState<Record<string, any>>({});
  const [insight, setInsight] = useState<{ summary: string; suggestions?: string[] } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const reset = () => { setStage('upload'); setError(''); setPreviewUri(undefined); setDate(''); setVals({}); setDetails({}); setInsight(null); setInsightLoading(false); };

  // AI coach opinion on the parsed result (async; hidden if AI unavailable)
  const loadInsight = (metrics: Record<string, unknown>) => {
    setInsight(null); setInsightLoading(true);
    nutritionApi.inbodyInsight(metrics)
      .then((r) => setInsight(r && r.summary ? r : null))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  };
  const close = () => { reset(); onClose(); };

  const runParse = async (file: { mimeType: string; data: string }, preview?: string) => {
    setPreviewUri(preview); setError(''); setStage('parsing');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const r = await nutritionApi.parseInbody(file);
      const v: Record<string, string> = {};
      for (const f of REVIEW_FIELDS) if (r[f.key] != null) v[f.key] = String(r[f.key]);
      setVals(v);
      const det = pickDetails(r);
      setDetails(det);
      const testDate = r.date || new Date().toISOString().split('T')[0];
      setDate(testDate);
      setStage('review');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // fetch the coach's opinion on the full detected result (async, non-blocking)
      const metrics: Record<string, unknown> = { date: testDate };
      for (const f of REVIEW_FIELDS) if (r[f.key] != null) metrics[f.key] = Number(r[f.key]);
      if (Object.keys(det).length) metrics.details = det;
      loadInsight(metrics);
    } catch (e: any) {
      const raw = String(e?.message ?? e);
      setError(
        /NOT_INBODY|doesn't look/i.test(raw) ? t('inbody.notInbody', { defaultValue: "That doesn't look like an InBody sheet. Try a clearer photo or the full PDF." })
        : /AI_UNAVAILABLE|not configured/i.test(raw) ? t('aiCreate.unavailable', { defaultValue: 'AI is not set up yet.' })
        : /Load failed|Network|tim</i.test(raw) ? t('aiCoach.netError', { defaultValue: 'That took too long or the connection dropped. Try again.' })
        : raw,
      );
      setStage('upload');
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    runParse({ mimeType: a.mimeType || 'image/jpeg', data: a.base64 || '' }, a.uri);
  };
  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await uriToBase64(a.uri);
      if (!data) throw new Error('read failed');
      runParse({ mimeType: a.mimeType || 'application/pdf', data }, a.mimeType?.startsWith('image') ? a.uri : undefined);
    } catch {
      setError(t('aiCreate.fileFailed', { defaultValue: 'Could not read that file. PDF or a clear photo works best.' }));
    }
  };

  const commit = () => {
    const num = (k: string) => { const n = parseFloat(vals[k]); return Number.isFinite(n) ? n : 0; };
    onSave({
      date: date || new Date().toISOString().split('T')[0],
      weight: num('weight'), muscleMass: num('muscleMass'), bodyFat: num('bodyFat'), bodyWater: num('bodyWater'),
      bmi: num('bmi'), bmr: num('bmr'), visceralFat: num('visceralFat'), skeletalMuscle: num('skeletalMuscle'),
      ...(Object.keys(details).length ? { details } : {}),
    });
    reset();
  };

  const detectedCount = REVIEW_FIELDS.filter((f) => vals[f.key]).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>
              {stage === 'review' ? t('inbody.reviewTitle', { defaultValue: 'Review & save' }) : t('inbody.uploadTitle', { defaultValue: 'Upload InBody test' })}
            </Text>
            <Pressable onPress={close} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>

          {stage !== 'review' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
              <View style={[s.uploadHero, { backgroundColor: Colors.electric + '12', borderColor: Colors.electric + '33' }]}>
                <Ionicons name="cloud-upload-outline" size={26} color={Colors.electric} />
                <Text style={[s.uploadHeroText, { color: theme.textSecondary }]}>
                  {t('inbody.uploadBlurb', { defaultValue: "Upload a photo or PDF of your InBody result. We'll read it and show you every value to confirm before saving." })}
                </Text>
              </View>
              {!!error && (
                <View style={[s.errorRow, { backgroundColor: Colors.semantic.danger + '15' }]}>
                  <Ionicons name="alert-circle" size={16} color={Colors.semantic.danger} />
                  <Text style={[s.errorText, { color: Colors.semantic.danger }]}>{error}</Text>
                </View>
              )}
              {stage === 'parsing' ? (
                <View style={s.parsingBox}>
                  <ActivityIndicator color={Colors.electric} />
                  <Text style={[s.parsingText, { color: theme.textSecondary }]}>{t('inbody.reading', { defaultValue: 'Reading your InBody sheet…' })}</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Pressable onPress={pickImage} style={({ pressed }) => [s.uploadBtn, { borderColor: Colors.electric + '55', opacity: pressed ? 0.85 : 1 }]}>
                    <Ionicons name="image-outline" size={20} color={Colors.electric} />
                    <Text style={[s.uploadBtnText, { color: Colors.electric }]}>{t('inbody.uploadPhoto', { defaultValue: 'Upload a photo' })}</Text>
                  </Pressable>
                  <Pressable onPress={pickFile} style={({ pressed }) => [s.uploadBtn, { borderColor: Colors.electric + '55', opacity: pressed ? 0.85 : 1 }]}>
                    <Ionicons name="document-attach-outline" size={20} color={Colors.electric} />
                    <Text style={[s.uploadBtnText, { color: Colors.electric }]}>{t('inbody.uploadPdf', { defaultValue: 'Upload a PDF / file' })}</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}

          {stage === 'review' && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
              <View style={[s.reviewBanner, { backgroundColor: Colors.electric + '12' }]}>
                <Ionicons name="sparkles" size={15} color={Colors.electric} />
                <Text style={[s.reviewBannerText, { color: theme.textSecondary }]}>
                  {t('inbody.detectedSummary', { defaultValue: 'Read {{n}} values. Check them and fix anything, then Save.', n: detectedCount })}
                </Text>
              </View>
              {!!previewUri && <Image source={{ uri: previewUri }} style={s.reviewThumb} resizeMode="cover" />}

              {(insightLoading || insight) && (
                <View style={[s.coachCard, { backgroundColor: Colors.electric + '0F', borderColor: Colors.electric + '33' }]}>
                  <View style={s.coachHead}>
                    <Ionicons name="sparkles" size={15} color={Colors.electric} />
                    <Text style={[s.coachTitle, { color: theme.text }]}>{t('inbody.coachTake', { defaultValue: "Coach's take" })}</Text>
                  </View>
                  {insightLoading ? (
                    <View style={s.coachLoading}><ActivityIndicator size="small" color={Colors.electric} /><Text style={[s.coachLoadingText, { color: theme.textMuted }]}>{t('inbody.coachThinking', { defaultValue: 'Reading your result…' })}</Text></View>
                  ) : insight ? (
                    <>
                      <Text style={[s.coachSummary, { color: theme.textSecondary }]}>{insight.summary}</Text>
                      {(insight.suggestions || []).map((sug, i) => (
                        <View key={i} style={s.coachSugRow}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.electric} />
                          <Text style={[s.coachSug, { color: theme.textSecondary }]}>{sug}</Text>
                        </View>
                      ))}
                    </>
                  ) : null}
                </View>
              )}

              {(() => {
                const pt = {
                  weight: parseFloat(vals.weight), bodyFat: parseFloat(vals.bodyFat),
                  muscleMass: parseFloat(vals.muscleMass), bodyWater: parseFloat(vals.bodyWater), details,
                };
                return (
                  <>
                    <CompositionBar test={pt} theme={theme} t={t} />
                    <SegmentalBars seg={details.segmentalLean} theme={theme} t={t} title={t('inbody.segmentalLean', { defaultValue: 'Segmental lean (kg)' })} />
                    <DetailGrid details={details} theme={theme} t={t} />
                  </>
                );
              })()}

              <Text style={[s.editHint, { color: theme.textMuted }]}>{t('inbody.editHint', { defaultValue: 'Check the core values below and fix anything before saving.' })}</Text>
              <View>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{t('inbody.testDate', { defaultValue: 'Test date' })}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textMuted}
                />
              </View>
              {REVIEW_FIELDS.map((f) => {
                const detected = !!vals[f.key];
                return (
                  <View key={f.key}>
                    <View style={s.fieldLabelRow}>
                      <Text style={[s.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>{t(f.labelKey)}</Text>
                      {!detected && <Text style={[s.notDetected, { color: theme.textMuted }]}>{t('inbody.notDetected', { defaultValue: 'not detected — add if you have it' })}</Text>}
                    </View>
                    <TextInput
                      style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: detected ? Colors.electric + '55' : theme.border }]}
                      value={vals[f.key] ?? ''}
                      onChangeText={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
                      keyboardType="numeric" placeholder="—" placeholderTextColor={theme.textMuted}
                    />
                  </View>
                );
              })}
              <Button variant="solid" label={t('inbody.commit', { defaultValue: 'Save this test' })} icon="checkmark-circle" onPress={commit} style={{ marginTop: 4 }} />
              <Pressable onPress={() => setStage('upload')} style={s.reuploadBtn}>
                <Ionicons name="refresh" size={15} color={theme.textMuted} />
                <Text style={[s.reuploadText, { color: theme.textMuted }]}>{t('inbody.reupload', { defaultValue: 'Upload a different file' })}</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InBodyTab({ inBodyTests, latestInBody, theme, onAddTest, userHeight, target, onEditTarget }: {
  inBodyTests: any[]; latestInBody: any; theme: any; onAddTest: () => void; userHeight?: number;
  target: { weight?: number; bodyFat?: number; skeletalMuscle?: number } | null; onEditTarget: () => void;
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
    { key: 'weight', label: t('workoutTab.metricWeight'), icon: 'scale-outline', color: Colors.electric, unit: 'kg', higherIsBetter: false },
    { key: 'bodyFat', label: t('workoutTab.metricBodyFat'), icon: 'pie-chart-outline', color: Colors.accent, unit: '%', higherIsBetter: false },
    { key: 'muscleMass', label: t('workoutTab.metricMuscleMass'), icon: 'barbell-outline', color: Colors.ring.blue, unit: 'kg', higherIsBetter: true },
    { key: 'bmi', label: t('workoutTab.metricBmi'), icon: 'analytics-outline', color: Colors.ring.amber, unit: '', higherIsBetter: false },
    { key: 'bodyWater', label: t('workoutTab.metricBodyWater'), icon: 'water-outline', color: Colors.ring.blue, unit: '%', higherIsBetter: true },
    { key: 'bmr', label: t('workoutTab.metricBmr'), icon: 'flame-outline', color: Colors.accent, unit: 'kcal', higherIsBetter: true },
    { key: 'visceralFat', label: t('workoutTab.metricVisceralFat'), icon: 'heart-outline', color: Colors.semantic.danger, unit: '', higherIsBetter: false },
    { key: 'skeletalMuscle', label: t('workoutTab.metricSkeletalMuscle'), icon: 'body-outline', color: Colors.electric, unit: '%', higherIsBetter: true },
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
        <Button variant="solid" label={t('workoutTab.addTest')} icon="add" onPress={onAddTest} style={s.addTestBtn} />
      </View>

      {latestInBody ? (
        <View>
          <View style={s.sectionHead}><SectionHeader title={t('workoutTab.latestResults')} /></View>
          <View style={s.inbodyGrid}>
            {metrics.map((item, i) => {
              let val = latestInBody[item.key];
              if (item.key === 'bmi' && (!val || val === 0) && derivedBmi) val = derivedBmi;
              const has = val != null && val !== 0;
              const comp = getComparisonData(item.key, item.higherIsBetter);
              return (
                <Animated.View key={item.label} entering={FadeInDown.duration(300).delay(i * 50)} style={s.inbodyStatWrap}>
                  <StatTile
                    icon={item.icon as any}
                    color={item.color}
                    label={item.label}
                    value={
                      <View style={{ gap: 4 }}>
                        <Text style={[Type.statSm, { color: has ? theme.text : theme.textMuted }]}>
                          {has ? `${val}${item.unit && item.key !== 'bmr' ? item.unit : ''}` : '—'}
                        </Text>
                        {comp && !comp.unchanged && (
                          <View style={[s.deltaRow, { backgroundColor: (comp.improved ? Colors.electric : Colors.semantic.danger) + '15' }]}>
                            <Ionicons
                              name={comp.improved ? 'arrow-up' : 'arrow-down'}
                              size={10}
                              color={comp.improved ? Colors.electric : Colors.semantic.danger}
                            />
                            <Text style={[s.deltaText, { color: comp.improved ? Colors.electric : Colors.semantic.danger }]}>
                              {Math.abs(comp.diff)}{item.unit}
                            </Text>
                          </View>
                        )}
                        {comp && comp.unchanged && (
                          <View style={[s.deltaRow, { backgroundColor: Colors.ring.amber + '15' }]}>
                            <Ionicons name="remove" size={10} color={Colors.ring.amber} />
                            <Text style={[s.deltaText, { color: Colors.ring.amber }]}>{t('workoutTab.noChange')}</Text>
                          </View>
                        )}
                      </View>
                    }
                  />
                </Animated.View>
              );
            })}
          </View>
          <Text style={[s.inbodyDate, { color: theme.textMuted }]}>{t('workoutTab.recorded', { date: latestInBody.date })}</Text>

          {(latestInBody.details || latestInBody.muscleMass) && (
            <View style={s.chartsWrap}>
              <CompositionBar test={latestInBody} theme={theme} t={t} />
              <SegmentalBars seg={latestInBody.details?.segmentalLean} theme={theme} t={t} title={t('inbody.segmentalLean', { defaultValue: 'Segmental lean (kg)' })} />
              <SegmentalBars seg={latestInBody.details?.segmentalFat} theme={theme} t={t} title={t('inbody.segmentalFat', { defaultValue: 'Segmental fat (kg)' })} />
              <DetailGrid details={latestInBody.details} theme={theme} t={t} />
            </View>
          )}

          <View style={s.sectionHead}><SectionHeader title={t('inbody.yourTarget', { defaultValue: 'Your target' })} /></View>
          <TargetCard target={target} latest={latestInBody} oldest={inBodyTests[inBodyTests.length - 1]} theme={theme} t={t} onEdit={onEditTarget} />

          {trendInsights.length > 0 && (
            <View>
              <View style={s.sectionHead}><SectionHeader title={t('workoutTab.aiInsights')} /></View>
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
              <View style={s.sectionHead}><SectionHeader title={t('workoutTab.testHistory')} /></View>
              {inBodyTests.slice(0, 8).map((test: any, i: number) => {
                const isLatest = i === 0;
                const prevTest = i < inBodyTests.length - 1 ? inBodyTests[i + 1] : null;
                const weightDelta = prevTest ? calcDelta(test.weight, prevTest.weight) : null;
                const fatDelta = prevTest ? calcDelta(test.bodyFat, prevTest.bodyFat) : null;
                const muscleDelta = prevTest ? calcDelta(test.muscleMass, prevTest.muscleMass) : null;
                return (
                  <Animated.View key={test.id} entering={FadeInRight.duration(300).delay(i * 60)}>
                    <View style={[s.historyCard, { backgroundColor: theme.card, borderColor: isLatest ? Colors.electric + '40' : 'transparent', borderWidth: isLatest ? 1 : 0 }]}>
                      <View style={s.historyCardHeader}>
                        <View style={s.historyDateRow}>
                          <Text style={[s.inbodyHistDate, { color: theme.text }]}>{test.date}</Text>
                          {isLatest && (
                            <View style={[s.latestBadge, { backgroundColor: Colors.electric + '20' }]}>
                              <Text style={[s.latestBadgeText, { color: Colors.electric }]}>{t('workoutTab.latest')}</Text>
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
                              <Ionicons name={weightDelta.diff < 0 ? 'caret-down' : 'caret-up'} size={10} color={weightDelta.diff < 0 ? Colors.electric : Colors.semantic.danger} />
                              <Text style={{ fontSize: 10, fontFamily: Fonts.monoBold, color: weightDelta.diff < 0 ? Colors.electric : Colors.semantic.danger }}>{Math.abs(weightDelta.diff)}</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.historyMetric}>
                          <Text style={[s.historyMetricVal, { color: Colors.accent }]}>{test.bodyFat}%</Text>
                          {fatDelta && fatDelta.diff !== 0 && (
                            <View style={s.historyDeltaRow}>
                              <Ionicons name={fatDelta.diff < 0 ? 'caret-down' : 'caret-up'} size={10} color={fatDelta.diff < 0 ? Colors.electric : Colors.semantic.danger} />
                              <Text style={{ fontSize: 10, fontFamily: Fonts.monoBold, color: fatDelta.diff < 0 ? Colors.electric : Colors.semantic.danger }}>{Math.abs(fatDelta.diff)}%</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.historyMetric}>
                          <Text style={[s.historyMetricVal, { color: Colors.ring.blue }]}>{test.muscleMass}kg</Text>
                          {muscleDelta && muscleDelta.diff !== 0 && (
                            <View style={s.historyDeltaRow}>
                              <Ionicons name={muscleDelta.diff > 0 ? 'caret-up' : 'caret-down'} size={10} color={muscleDelta.diff > 0 ? Colors.electric : Colors.semantic.danger} />
                              <Text style={{ fontSize: 10, fontFamily: Fonts.monoBold, color: muscleDelta.diff > 0 ? Colors.electric : Colors.semantic.danger }}>{Math.abs(muscleDelta.diff)}</Text>
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
                    <LinearGradient colors={[Colors.electric + '15', Colors.ring.blue + '15']} style={s.totalProgressCard}>
                      <View style={s.totalProgressHeader}>
                        <Ionicons name="analytics" size={20} color={Colors.electric} />
                        <Text style={[s.totalProgressTitle, { color: theme.text }]}>{t('workoutTab.totalJourney')}</Text>
                        <Text style={[s.totalProgressSub, { color: theme.textMuted }]}>{t('workoutTab.since', { date: oldest.date })}</Text>
                      </View>
                      <View style={s.totalProgressRow}>
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.metricWeight')}</Text>
                          <Text style={[s.totalProgressValue, { color: wDelta.diff <= 0 ? Colors.electric : Colors.accent }]}>
                            {wDelta.diff > 0 ? '+' : ''}{wDelta.diff}kg
                          </Text>
                        </View>
                        <View style={[s.totalProgressDivider, { backgroundColor: theme.border }]} />
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.metricBodyFat')}</Text>
                          <Text style={[s.totalProgressValue, { color: fDelta.diff <= 0 ? Colors.electric : Colors.semantic.danger }]}>
                            {fDelta.diff > 0 ? '+' : ''}{fDelta.diff}%
                          </Text>
                        </View>
                        <View style={[s.totalProgressDivider, { backgroundColor: theme.border }]} />
                        <View style={s.totalProgressItem}>
                          <Text style={[s.totalProgressLabel, { color: theme.textMuted }]}>{t('workoutTab.muscleShort')}</Text>
                          <Text style={[s.totalProgressValue, { color: mDelta.diff >= 0 ? Colors.electric : Colors.semantic.danger }]}>
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
          <Button variant="solid" label={t('workoutTab.addFirstTest')} icon="add-circle-outline" onPress={onAddTest} style={{ marginTop: 12 }} />
        </View>
      )}
    </View>
  );
}

// progress toward a body-composition target for the metrics the user set
function TargetCard({ target, latest, oldest, theme, t, onEdit }: {
  target: { weight?: number; bodyFat?: number; skeletalMuscle?: number } | null;
  latest: any; oldest: any; theme: any; t: any; onEdit: () => void;
}) {
  const rows = [
    { key: 'weight', label: t('workoutTab.metricWeight'), unit: 'kg', dir: 'either' as const },
    { key: 'bodyFat', label: t('workoutTab.metricBodyFat'), unit: '%', dir: 'down' as const },
    { key: 'skeletalMuscle', label: t('workoutTab.metricSkeletalMuscle'), unit: 'kg', dir: 'up' as const },
  ].filter((r) => target && (target as any)[r.key] != null);

  if (!rows.length) {
    return (
      <Pressable onPress={onEdit} style={({ pressed }) => [s.setTargetCard, { backgroundColor: theme.card, borderColor: Colors.electric + '44', opacity: pressed ? 0.9 : 1 }]}>
        <Ionicons name="flag-outline" size={20} color={Colors.electric} />
        <View style={{ flex: 1 }}>
          <Text style={[s.setTargetTitle, { color: theme.text }]}>{t('inbody.setTarget', { defaultValue: 'Set a target' })}</Text>
          <Text style={[s.setTargetSub, { color: theme.textMuted }]}>{t('inbody.setTargetSub', { defaultValue: 'Track progress toward your goal weight, body fat or muscle' })}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={[s.targetCard, { backgroundColor: theme.card }]}>
      <View style={s.targetHeader}>
        <Ionicons name="flag" size={16} color={Colors.electric} />
        <Text style={[s.targetHeaderTitle, { color: theme.text, flex: 1 }]}>{t('inbody.targetProgress', { defaultValue: 'Target progress' })}</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="create-outline" size={15} color={theme.textMuted} />
          <Text style={[s.targetEdit, { color: theme.textMuted }]}>{t('profile.edit', { defaultValue: 'Edit' })}</Text>
        </Pressable>
      </View>
      {rows.map((r) => {
        const cur = Number(latest?.[r.key]);
        const tgt = Number((target as any)[r.key]);
        const start = oldest && oldest !== latest ? Number(oldest[r.key]) : NaN;
        const reached = r.dir === 'down' ? cur <= tgt : r.dir === 'up' ? cur >= tgt : Math.abs(cur - tgt) <= 0.5;
        let progress = reached ? 1 : NaN;
        if (!reached && Number.isFinite(start) && start !== tgt) {
          progress = tgt < start ? (start - cur) / (start - tgt) : (cur - start) / (tgt - start);
          progress = Math.max(0, Math.min(1, progress));
        }
        const gap = Math.round((cur - tgt) * 10) / 10;
        return (
          <View key={r.key} style={s.targetRow}>
            <View style={s.targetRowTop}>
              <Text style={[s.targetLabel, { color: theme.textSecondary }]}>{r.label}</Text>
              <Text style={[s.targetVals, { color: theme.text }]}>
                {Number.isFinite(cur) ? cur : '—'}{r.unit} <Text style={{ color: theme.textMuted }}>→ {tgt}{r.unit}</Text>
              </Text>
            </View>
            <View style={[s.targetTrack, { backgroundColor: theme.cardAlt }]}>
              <View style={[s.targetFill, { width: `${Math.round((Number.isFinite(progress) ? progress : 0) * 100)}%`, backgroundColor: reached ? Colors.electric : Colors.ring.blue }]} />
            </View>
            <Text style={[s.targetGap, { color: reached ? Colors.electric : theme.textMuted }]}>
              {reached ? t('inbody.targetReached', { defaultValue: 'Target reached 🎯' }) : t('inbody.targetGap', { defaultValue: '{{n}}{{u}} to go', n: Math.abs(gap), u: r.unit })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function InBodyTargetModal({ visible, initial, onClose, onSave }: {
  visible: boolean; initial: { weight?: number; bodyFat?: number; skeletalMuscle?: number } | null;
  onClose: () => void; onSave: (t: { weight?: number; bodyFat?: number; skeletalMuscle?: number }) => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [skeletalMuscle, setSkeletalMuscle] = useState('');
  React.useEffect(() => {
    if (visible) {
      setWeight(initial?.weight != null ? String(initial.weight) : '');
      setBodyFat(initial?.bodyFat != null ? String(initial.bodyFat) : '');
      setSkeletalMuscle(initial?.skeletalMuscle != null ? String(initial.skeletalMuscle) : '');
    }
  }, [visible, initial]);

  const fields = [
    { label: t('workoutTab.fieldWeightKg', { defaultValue: 'Weight (kg)' }), value: weight, set: setWeight },
    { label: t('workoutTab.fieldBodyFatPct', { defaultValue: 'Body fat (%)' }), value: bodyFat, set: setBodyFat },
    { label: t('workoutTab.fieldSkeletalMusclePct', { defaultValue: 'Skeletal muscle (kg)' }), value: skeletalMuscle, set: setSkeletalMuscle },
  ];
  const save = () => {
    const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : undefined; };
    onSave({ weight: num(weight), bodyFat: num(bodyFat), skeletalMuscle: num(skeletalMuscle) });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={[s.modalContent, { backgroundColor: theme.background }]}>
          <View style={s.modalHandle}><View style={[s.handleBar, { backgroundColor: theme.border }]} /></View>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: theme.text }]}>{t('inbody.setTargetTitle', { defaultValue: 'Set your target' })}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={theme.text} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
            <Text style={[s.setTargetSub, { color: theme.textMuted, marginBottom: 4 }]}>{t('inbody.setTargetHint', { defaultValue: 'Fill only the metrics you want to track. Leave the rest blank.' })}</Text>
            {fields.map((f) => (
              <View key={f.label}>
                <Text style={[s.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={f.value} onChangeText={f.set} keyboardType="numeric" placeholder="—" placeholderTextColor={theme.textMuted}
                />
              </View>
            ))}
            <Button variant="solid" label={t('inbody.saveTarget', { defaultValue: 'Save target' })} icon="checkmark-circle" onPress={save} style={{ marginTop: 4 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function InBodySection() {
  const { isDark, inBodyTests, addInBodyTest, user } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const [showInBodyModal, setShowInBodyModal] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [target, setTarget] = useState<{ weight?: number; bodyFat?: number; skeletalMuscle?: number } | null>(null);
  React.useEffect(() => { nutritionApi.inbodyTarget().then(setTarget).catch(() => {}); }, []);

  const latestInBody = inBodyTests.length > 0 ? inBodyTests[0] : null;

  const handleSaveInBody = (data: any) => {
    addInBodyTest(data);
    setShowInBodyModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  const handleSaveTarget = (t: { weight?: number; bodyFat?: number; skeletalMuscle?: number }) => {
    setTarget(t);
    setShowTarget(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nutritionApi.setInbodyTarget(t).catch(() => {}); // optimistic + sync
  };

  return (
    <View>
      <InBodyTab
        inBodyTests={inBodyTests}
        latestInBody={latestInBody}
        theme={theme}
        userHeight={user?.height}
        target={target}
        onEditTarget={() => { setShowTarget(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onAddTest={() => { setShowInBodyModal(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      />
      <InBodyUploadModal visible={showInBodyModal} onClose={() => setShowInBodyModal(false)} onSave={handleSaveInBody} />
      <InBodyTargetModal visible={showTarget} initial={target} onClose={() => setShowTarget(false)} onSave={handleSaveTarget} />
    </View>
  );
}

const s = StyleSheet.create({
  sectionHead: { paddingHorizontal: 20, marginTop: 24 },
  emptyCard: {
    marginHorizontal: 20, borderRadius: 16, padding: 32, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.semibold },
  emptySub: { fontSize: 13, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 19 },
  insightsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightsTitle: { fontSize: 17, fontFamily: Fonts.semibold },
  insightsSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  insightCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  insightIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  insightText: { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
  inbodyHeader: {
    marginHorizontal: 20, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4,
  },
  addTestBtn: { height: 40, paddingHorizontal: 14 },
  inbodyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10 },
  inbodyStatWrap: { width: (SW - 50) / 2 },
  inbodyDate: { fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
  setTargetCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  setTargetTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  setTargetSub: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 17 },
  targetCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, gap: 14 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetHeaderTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  targetEdit: { fontSize: 13, fontFamily: Fonts.medium },
  targetRow: { gap: 6 },
  targetRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetLabel: { fontSize: 13, fontFamily: Fonts.medium },
  targetVals: { fontSize: 14, fontFamily: Fonts.semibold },
  targetTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  targetFill: { height: 8, borderRadius: 4 },
  targetGap: { fontSize: 11.5, fontFamily: Fonts.medium },
  inbodyHistDate: { fontSize: 13, fontFamily: Fonts.semibold },
  deltaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4,
  },
  deltaText: { fontSize: 10, fontFamily: Fonts.monoBold },
  historyCard: {
    marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14,
  },
  historyCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  latestBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  latestBadgeText: { fontSize: 10, fontFamily: Fonts.semibold },
  historyTimeAgo: { fontSize: 11, fontFamily: Fonts.regular },
  historyMetrics: { flexDirection: 'row', justifyContent: 'space-around' },
  historyMetric: { alignItems: 'center', gap: 2 },
  historyMetricVal: { fontSize: 14, fontFamily: Fonts.monoBold },
  historyDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  totalProgressCard: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 16,
  },
  totalProgressHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  totalProgressTitle: { fontSize: 15, fontFamily: Fonts.semibold },
  totalProgressSub: { fontSize: 11, fontFamily: Fonts.regular },
  totalProgressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  totalProgressItem: { alignItems: 'center', gap: 4 },
  totalProgressLabel: { fontSize: 11, fontFamily: Fonts.regular },
  totalProgressValue: { fontSize: 20, fontFamily: Fonts.monoBold },
  totalProgressDivider: { width: 1, height: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 8, maxHeight: '85%' },
  modalHandle: { alignItems: 'center', paddingVertical: 8 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.bold },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.medium, marginBottom: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  notDetected: { fontSize: 11, fontFamily: Fonts.regular, fontStyle: 'italic' },
  fieldInput: {
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontFamily: Fonts.medium, borderWidth: 1,
  },
  uploadHero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  uploadHeroText: { flex: 1, fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 19 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  uploadBtnText: { fontSize: 15, fontFamily: Fonts.semibold },
  parsingBox: { alignItems: 'center', gap: 12, paddingVertical: 36 },
  parsingText: { fontSize: 14, fontFamily: Fonts.medium },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  reviewBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  reviewBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
  reviewThumb: { width: '100%', height: 160, borderRadius: 12, backgroundColor: '#fff' },
  coachCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  coachHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachTitle: { fontSize: 14, fontFamily: Fonts.semibold },
  coachLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coachLoadingText: { fontSize: 13, fontFamily: Fonts.regular, fontStyle: 'italic' },
  coachSummary: { fontSize: 13.5, fontFamily: Fonts.regular, lineHeight: 20 },
  coachSugRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  coachSug: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, lineHeight: 18 },
  reuploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  reuploadText: { fontSize: 13, fontFamily: Fonts.medium },
  editHint: { fontSize: 12, fontFamily: Fonts.regular, marginTop: 4, marginBottom: 2 },
  // charts (shared: review card + saved latest view)
  chartsWrap: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  chartCard: { borderRadius: 16, padding: 14, gap: 12 },
  chartTitle: { fontSize: 14, fontFamily: Fonts.semibold },
  compBar: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden' },
  compLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  compLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compDot: { width: 9, height: 9, borderRadius: 3 },
  compLegendLabel: { fontSize: 12, fontFamily: Fonts.medium },
  compLegendVal: { fontSize: 12, fontFamily: Fonts.monoBold },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  segLabel: { fontSize: 12, fontFamily: Fonts.medium, width: 66 },
  segTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  segFill: { height: 10, borderRadius: 5 },
  segVal: { fontSize: 12, fontFamily: Fonts.monoBold, width: 52, textAlign: 'right' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: (SW - 40 - 28 - 16) / 3, borderWidth: 1, borderRadius: 12, padding: 10, gap: 3, alignItems: 'flex-start' },
  detailVal: { fontSize: 15, fontFamily: Fonts.monoBold },
  detailLabel: { fontSize: 10.5, fontFamily: Fonts.regular },
});
