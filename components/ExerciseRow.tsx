import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { exerciseIcon } from '@/lib/exercise-icon';
import { useApp } from '@/lib/app-context';
import { muscleLabel } from '@/lib/exercise-i18n';

// Nafas exercise-picker row: branded media tile · name · primary-muscle subtitle ·
// trailing progress-arrow (opens the exercise's progression chart).
// Real demonstration photos are hidden for now — the media tile is a Nafas-brand
// placeholder (green gradient squircle + exercise-type glyph), identical treatment
// for every exercise until real images land.
export default function ExerciseRow({ ex, onPress, theme, trailing, divider = true, onInfo }: {
  ex: any;
  onPress: () => void;
  theme: typeof Colors.dark;
  trailing?: React.ReactNode;
  divider?: boolean;
  // when the picker is inside a RN <Modal>, pass this so the info-arrow can close
  // the modal before navigating (else exercise-progress renders behind the modal)
  onInfo?: (name: string) => void;
}) {
  const { language } = useApp();
  const isAr = language === 'ar';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        { backgroundColor: pressed ? theme.card : 'transparent' },
      ]}
    >
      <LinearGradient
        colors={[Colors.primary + '2E', Colors.primary + '0A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.tile}
      >
        <MaterialCommunityIcons
          name={exerciseIcon(ex.name, ex.muscleGroup) as any}
          size={24}
          color={Colors.primary}
        />
      </LinearGradient>

      <View style={s.textCol}>
        <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{ex.name}</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {muscleLabel(ex.primaryMuscle || ex.muscleGroup, isAr)}
        </Text>
      </View>

      {trailing !== undefined ? trailing : (
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onInfo) onInfo(ex.name);
            else router.push(`/exercise-progress?name=${encodeURIComponent(ex.name)}` as any);
          }}
          style={({ pressed }) => [s.progressBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="trending-up" size={16} color={theme.textSecondary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12 },
  tile: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '26',
  },
  textCol: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  progressBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
