import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { playerColorWithOpacity } from '../theme/colors';

/** Broad diagonal reflections give each podium card its metallic finish. */
export default function PodiumWaves({ color }: { color: string }) {
  return <View pointerEvents="none" accessible={false} style={styles.clip}>
    {[-1, 0, 1, 2].map(band => <LinearGradient key={band}
      colors={[playerColorWithOpacity(color, 0), playerColorWithOpacity(color, 85), 'rgba(255,255,255,0.78)', playerColorWithOpacity(color, 28)]}
      locations={[0, 0.4, 0.49, 1]} start={{x:0,y:0}} end={{x:1,y:0}}
      style={[styles.band, { left: band * 92 }]} />)}
  </View>;
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', right: 0, top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  band: { position: 'absolute', top: -100, width: 72, height: 420, transform: [{ rotate: '42deg' }] },
});
