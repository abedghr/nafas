import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useApp } from '@/lib/app-context';
import { confirmDialog, alertDialog } from '@/lib/dialog';
import Colors from '@/constants/colors';
import { Display } from '@/components/ui';
import { type WeightUnit } from '@/lib/units';

// One inset grouped-list row.
function Row({ icon, label, right, onPress, isDark, destructive, last }: any) {
  const theme = isDark ? Colors.dark : Colors.light;
  const tint = destructive ? Colors.semantic.danger : Colors.electric;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, { backgroundColor: pressed ? theme.cardAlt : 'transparent' }]}>
      <View style={[s.rowIcon, { backgroundColor: tint + '15' }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <Text style={[s.rowLabel, { color: destructive ? Colors.semantic.danger : theme.text }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {right || (!destructive && <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />)}
      {!last && <View style={[s.divider, { backgroundColor: theme.border }]} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme, language, setLanguage, weightUnit, setWeightUnit, logout, deleteAccount } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang); i18n.changeLanguage(newLang);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout(); router.replace('/auth');
  };
  const handleDelete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (await confirmDialog({ title: t('profile.delete_account'), message: t('profile.delete_account_confirm'), destructive: true, confirmText: t('profile.delete_account'), cancelText: t('workoutSession.cancel') })) {
      try { await deleteAccount(); router.replace('/auth'); }
      catch (e: any) { await alertDialog(t('profile.delete_account'), e?.message || t('discover.save_failed')); }
    }
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Display variant="d3" color={theme.text}>{t('profile.settings')}</Display>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{t('profile.settings')}</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Row icon="moon-outline" label={t('profile.dark_mode')} isDark={isDark} onPress={toggleTheme}
            right={
              <Pressable onPress={toggleTheme} style={[s.themeTrack, { backgroundColor: isDark ? Colors.electric : theme.border, justifyContent: isDark ? 'flex-end' : 'flex-start' }]}>
                <View style={s.themeKnob}><Ionicons name={isDark ? 'moon' : 'sunny'} size={12} color={isDark ? Colors.electric : '#F5A623'} /></View>
              </Pressable>
            } />
          <Row icon="language-outline" label={t('profile.language')} isDark={isDark} onPress={toggleLanguage}
            right={
              <View style={s.valueRow}>
                <Text style={[s.value, { color: theme.textMuted }]}>{language === 'en' ? 'English' : 'العربية'}</Text>
                <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
              </View>
            } />
          <Row icon="barbell-outline" label={t('profilex.weightUnit')} isDark={isDark} last
            right={
              <View style={s.unitRow}>
                {(['kg', 'lb'] as WeightUnit[]).map(u => (
                  <Pressable key={u} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWeightUnit(u); }}
                    style={[s.unitChip, { backgroundColor: weightUnit === u ? Colors.electric : theme.cardAlt }]}>
                    <Text style={[s.unitText, { color: weightUnit === u ? '#04120B' : theme.textSecondary }]}>{u.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            } />
        </View>

        <Text style={[s.sectionTitle, { color: theme.textSecondary }]}>{t('profile.account', { defaultValue: 'Account' })}</Text>
        <View style={[s.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Row icon="person-outline" label={t('profile.edit')} isDark={isDark} onPress={() => router.push('/edit-profile' as any)} />
          <Row icon="log-out-outline" label={t('profile.logout')} isDark={isDark} destructive onPress={handleLogout} />
          <Row icon="trash-outline" label={t('profile.delete_account')} isDark={isDark} destructive last onPress={handleDelete} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sectionTitle: { fontSize: 12, fontFamily: 'Rubik_600SemiBold', letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 12, marginTop: 12 },
  group: { marginHorizontal: 20, marginBottom: 8, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, minHeight: 56 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontFamily: 'Rubik_500Medium' },
  divider: { position: 'absolute', left: 58, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  value: { fontSize: 14, fontFamily: 'Rubik_500Medium' },
  themeTrack: { width: 48, height: 28, borderRadius: 14, padding: 2, flexDirection: 'row', alignItems: 'center' },
  themeKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  unitRow: { flexDirection: 'row', gap: 4 },
  unitChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  unitText: { fontSize: 12, fontFamily: 'Rubik_700Bold' },
});
