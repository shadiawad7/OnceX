import type { ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import Brand from './Brand';
import { colors } from '../theme/colors';
type Props = {
  fallback?: Href;
  root?: boolean;
  transparent?: boolean;
  hideBack?: boolean;
  logoStyle?: StyleProp<ImageStyle>;
  rightAction?: ReactNode;
};
export default function ScreenHeader({
  fallback = '/login',
  root = false,
  transparent = false,
  hideBack = false,
  logoStyle,
  rightAction
}: Props) {
  const goBack = () => {
    if (router.canGoBack()) router.back();else if (fallback === '/') router.replace({
      pathname: '/',
      params: {
        manual: '1'
      }
    });else router.replace(fallback);
  };
  return <View style={[styles.header, transparent && styles.transparent]}>
      <View style={rightAction ? styles.actionSide : styles.spacer}>{hideBack ? <View style={styles.spacer} /> : <Pressable accessibilityRole="button" accessibilityLabel="Volver atrás" accessibilityState={{
      disabled: root
    }} disabled={root} onPress={goBack} style={({
      pressed
    }) => [styles.back, root && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.arrow}>←</Text>
      </Pressable>}</View>
      {!root && <Brand style={logoStyle} />}
      {rightAction ? <View style={[styles.actionSide,styles.actionRight]}>{rightAction}</View> : <View style={styles.spacer} />}
    </View>;
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'rgba(4, 5, 7, 0.28)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 70, 82, 0.2)'
  },
  transparent: { backgroundColor: 'transparent', borderBottomWidth: 0 },
  actionSide: { width: 92, justifyContent: 'center' },
  actionRight: { alignItems: 'flex-end' },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  arrow: {
    fontSize: 26,
    color: colors.white
  },
  spacer: {
    width: 44
  },
  disabled: {
    opacity: 0.3
  },
  pressed: {
    opacity: 0.6
  }
});
