import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/lib/app-context';
import { muscleLabel } from '@/lib/exercise-i18n';

// Nafas exercise-picker row: media tile · name · primary-muscle subtitle ·
// trailing progress-arrow (opens the exercise's progression chart). Shows the
// exercise photo when available (open-licensed free-exercise-db), else a
// Nafas-brand gradient squircle + exercise-type glyph.
export default function ExerciseRow({ ex, onPress, theme, trailing, divider = true, onInfo, highlighted }: {
  ex: any;
  onPress: () => void;
  theme: typeof Colors.dark;
  trailing?: React.ReactNode;
  divider?: boolean;
  // opens the exercise-info sheet (a Modal, floats above any host modal). Passed the
  // full exercise object so the sheet needs no lookup/fetch.
  onInfo?: (ex: any) => void;
  // tint the info button for the exercise whose info was last opened
  highlighted?: boolean;
}) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const [imgErr, setImgErr] = useState(false);
  const media = ex.gifUrl || ex.imageUrl; // animated GIF preferred, else photo
  const showImg = !!media && !imgErr;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        { backgroundColor: pressed ? theme.card : 'transparent' },
      ]}
    >
      {showImg ? (
        <Image
          source={{ uri: media }}
          style={s.tileImg}
          resizeMode="cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <LinearGradient
          colors={[Colors.primary + '2E', Colors.primary + '0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.tile}
        >
          <Ionicons name="body-outline" size={24} color={Colors.primary} />
        </LinearGradient>
      )}

      <View style={s.textCol}>
        <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{ex.name}</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {muscleLabel(ex.primaryMuscle || ex.muscleGroup, isAr)}
        </Text>
      </View>

      <View style={s.rightWrap}>
        {(onInfo || trailing === undefined) && (
          <Pressable
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (onInfo) onInfo(ex);
              else router.push(`/exercise-progress?name=${encodeURIComponent(ex.name)}` as any);
            }}
            style={({ pressed }) => [s.progressBtn, { borderColor: highlighted ? Colors.electric : theme.border, backgroundColor: highlighted ? Colors.electric + '1A' : 'transparent', opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="information-circle-outline" size={17} color={highlighted ? Colors.electric : theme.textSecondary} />
          </Pressable>
        )}
        {trailing}
      </View>
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
  tileImg: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff' },
  textCol: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  subtitle: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  rightWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
