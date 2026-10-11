import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import Brand from './Brand';
import { colors } from '../theme/colors';
type Props = {
  fallback?: Href;
  root?: boolean;
  logoStyle?: StyleProp<ImageStyle>;
};
export default function ScreenHeader({
  fallback = '/login',
  root = false,
  logoStyle
}: Props) {
  const goBack = () => {
    if (router.canGoBack()) router.back();else if (fallback === '/') router.replace({
      pathname: '/',
      params: {
        manual: '1'
      }
    });else router.replace(fallback);
  };
  return <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver atrás" accessibilityState={{
      disabled: root
    }} disabled={root} onPress={goBack} style={({
      pressed
    }) => [styles.back, root && styles.disabled, pressed && styles.pressed]}>
        <Text style={styles.arrow}>←</Text>
      </Pressable>
      {!root && <Brand style={logoStyle} />}
      <View style={styles.spacer} />
    </View>;
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
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
