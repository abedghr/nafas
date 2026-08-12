import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/lib/app-context';
import Colors from '@/constants/colors';
import { Fonts, Type } from '@/constants/typography';

// Editorial section header: overline-style title + optional "See all". Structure encodes a real
// section, not decoration.
export function SectionHeader({ title, onSeeAll, style }: { title: string; onSeeAll?: () => void; style?: any }) {
  const { t } = useTranslation();
  const { isDark } = useApp();
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[s.row, style]}>
      <Text style={[Type.overline, { color: theme.textSecondary }]}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={[s.seeAll, { color: Colors.electric }]}>{t('common.seeAll', { defaultValue: 'See all' })}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  seeAll: { fontFamily: Fonts.semibold, fontSize: 12 },
});
