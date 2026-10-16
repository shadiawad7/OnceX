import { StyleSheet, View } from 'react-native';
import { playerColorWithOpacity, playerIconStripeOpacityPercent, playerIconStripeRotationDegrees } from '../theme/colors';

/** Clip the rotated pattern to the circle, independently of the icon. */
export default function IconCircleStripes({ color }: { color: string }) {
  return <View pointerEvents="none" accessible={false} style={styles.fill}>
    {[1, -1].map(direction => <View key={direction} style={[styles.pattern, { transform: [{ rotate: `${direction * playerIconStripeRotationDegrees}deg` }] }]}>
      {[20, 30, 40, 50, 60, 70, 80].map(top => <View key={top} style={[styles.line, { top: `${top}%`, backgroundColor: playerColorWithOpacity(color, playerIconStripeOpacityPercent) }]} />)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  fill: { zIndex: 0, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 100, overflow: 'hidden' },
  pattern: { position: 'absolute', top: '-25%', bottom: '-25%', left: '-25%', right: '-25%' },
  line: { position: 'absolute', left: 0, right: 0, height: 1 },
});
