import React from 'react';
import { View, StyleSheet, Pressable, ImageSourcePropType, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Display } from './Display';
import { Button } from './Button';

// Full-bleed hero card: photo (or brand-gradient fallback) + dark scrim + uppercase display
// title + optional CTA. The marquee surface on home / discover / gym / event screens.
export function HeroCard({
  image,
  title,
  subtitle,
  ctaLabel,
  onCta,
  onPress,
  height = 200,
  children,
  style,
}: {
  image?: ImageSourcePropType;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onPress?: () => void;
  height?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.card, { height }, style]}>
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient colors={['#12332A', '#0B1F18', Colors.electric + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['transparent', 'rgba(5,10,8,0.85)']} style={StyleSheet.absoluteFill} />
      <View style={s.content}>
        {children}
        {!!subtitle && <Display variant="d3" color="#E6F5EE" style={{ opacity: 0.9 }}>{subtitle}</Display>}
        {!!title && <Display variant="d2" color="#fff">{title}</Display>}
        {ctaLabel && <Button label={ctaLabel} onPress={onCta || onPress} style={{ marginTop: 12, alignSelf: 'flex-start', minWidth: 200 }} />}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  content: { padding: 20, gap: 2 },
});
