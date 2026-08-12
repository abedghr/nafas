import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageSourcePropType, ViewStyle, DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Display } from './Display';
import { Fonts } from '@/constants/typography';

// Photo card with overlay title (workout programs, goals, gyms, events, coaches, restaurants).
// Falls back to a brand gradient when no image is supplied yet.
export function PhotoTile({
  image,
  title,
  tag,
  width = '100%',
  height = 150,
  onPress,
  bookmarked,
  onBookmark,
  ctaLabel,
  style,
}: {
  image?: ImageSourcePropType;
  title: string;
  tag?: string;
  width?: DimensionValue;
  height?: number;
  onPress?: () => void;
  bookmarked?: boolean;
  onBookmark?: () => void;
  ctaLabel?: string;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[s.card, { width, height }, style]}>
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient colors={['#1A3A30', '#0C201A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(5,10,8,0.82)']} style={StyleSheet.absoluteFill} />
      {onBookmark && (
        <Pressable onPress={onBookmark} hitSlop={8} style={s.bookmark}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color="#fff" />
        </Pressable>
      )}
      <View style={s.body}>
        {!!tag && <Text style={s.tag}>{tag}</Text>}
        <Display variant="d3" color="#fff" numberOfLines={2}>{title}</Display>
        {!!ctaLabel && (
          <View style={s.cta}><Text style={s.ctaText}>{ctaLabel}</Text></View>
        )}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  body: { padding: 14, gap: 6 },
  tag: { fontFamily: Fonts.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: Colors.electric },
  bookmark: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  ctaText: { fontFamily: Fonts.bold, fontSize: 11, color: '#0A0A0F', textTransform: 'uppercase', letterSpacing: 0.5 },
});
