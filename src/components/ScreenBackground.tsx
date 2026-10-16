import type { ReactNode } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
// Image blur uses a radius rather than a percentage; 10 gives a moderate softening.
export const SCREEN_BACKGROUND_BLUR = 10;
export default function ScreenBackground({children}:{children:ReactNode}) {
 return <ImageBackground source={require('../../assets/bg_resto.png')} resizeMode="cover" blurRadius={SCREEN_BACKGROUND_BLUR} style={styles.background}>{children}</ImageBackground>;
}
const styles=StyleSheet.create({background:{flex:1,backgroundColor:colors.background}});
