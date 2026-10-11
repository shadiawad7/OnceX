import type { ImageStyle, StyleProp } from 'react-native';
import { Image, StyleSheet } from 'react-native';
export default function Brand({
  style
}: {
  style?: StyleProp<ImageStyle>;
}) {
  return <Image source={require('../../assets/oncex-logo.png')} accessibilityLabel="ONCEX · Fútbol, evolución y rendimiento" resizeMode="contain" style={[styles.brand, style]} />;
}
const styles = StyleSheet.create({
  brand: {
    width: 200,
    height: 80,
    paddingVertical: 0,
    marginVertical: 20,
    alignSelf: 'center'
  }
});
