import React, { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { exerciseIcon } from '@/lib/exercise-icon';
import MuscleMap from '@/components/MuscleMap';

// Hevy-style exercise picker row: circular image (icon fallback) + name +
// primary-muscle subtitle + trailing action (default: progress-arrow that
// opens the exercise's progression chart).
export default function ExerciseRow({ ex, onPress, theme, trailing }: {
  ex: any;
  onPress: () => void;
  theme: typeof Colors.dark;
  trailing?: React.ReactNode;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!ex.imageUrl && !imgFailed;
  const muscles: string[] = ex.muscles || [];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, { backgroundColor: pressed ? theme.card : 'transparent' }]}>
      {muscles.length ? (
        // owned muscle-map (our own asset — matches assets/exercises/<slug>.svg), highlights the worked muscle
        <View style={s.imageCircle}>
          <MuscleMap muscles={muscles} primary={muscles[0]} size={44} />
        </View>
      ) : showImage ? (
        <View style={s.imageCircle}>
          <Image source={{ uri: ex.imageUrl }} style={s.image} resizeMode="cover" onError={() => setImgFailed(true)} />
        </View>
      ) : (
        <View style={[s.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
          <MaterialCommunityIcons name={exerciseIcon(ex.name, ex.muscleGroup) as any} size={22} color={Colors.primary} />
        </View>
      )}
      <View style={s.textCol}>
        <Text style={[s.name, { color: theme.text }]} numberOfLines={1}>{ex.name}</Text>
        <Text style={[s.subtitle, { color: theme.textMuted }]} numberOfLines={1}>{ex.primaryMuscle || ex.muscleGroup}</Text>
      </View>
      {trailing !== undefined ? trailing : (
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/exercise-progress?name=${encodeURIComponent(ex.name)}` as any);
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  imageCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: 48, height: 48 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  progressBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
