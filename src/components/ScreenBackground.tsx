import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
// Image blur uses a radius rather than a percentage; 10 gives a moderate softening.
export const SCREEN_BACKGROUND_BLUR = 10;
export default function ScreenBackground({children}:{children:ReactNode}) {
 return <View style={styles.background}><Image source={require('../../assets/bg_resto.png')} resizeMode="cover" blurRadius={SCREEN_BACKGROUND_BLUR} style={StyleSheet.absoluteFill} accessible={false} pointerEvents="none"/>{children}</View>;
}
const styles=StyleSheet.create({background:{flex:1,backgroundColor:colors.background}});
