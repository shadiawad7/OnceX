import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/** Decorative layers fade into the screen wallpaper without dimming card content. */
export default function BlendedCardBackground() {
  return <>
    <LinearGradient pointerEvents="none" colors={['rgba(4, 8, 16, 0.85)', 'rgba(5, 12, 24, 0.48)', 'rgba(5, 12, 24, 0)']} locations={[0, 0.55, 1]} style={styles.fill} />
    <LinearGradient pointerEvents="none" colors={['rgba(35, 85, 145, 0.7s5)', 'rgba(35, 85, 145, 0)']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.fill} />
  </>;
}
const styles = StyleSheet.create({fill: {position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 18}});
