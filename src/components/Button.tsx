import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
export default function Button({
  label,
  onPress,
  secondary = false,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({
    pressed
    }) => [styles.button, secondary && styles.buttonSecondary, (pressed || disabled) && styles.pressed]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
      {!secondary && <Text style={styles.buttonArrow}>→</Text>}
    </Pressable>;
}
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.red,
    height: 54,
    borderRadius: 12,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 18
  },
  pressed: {
    opacity: 0.72
  },
  buttonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2
  },
  buttonTextSecondary: {
    color: colors.white
  },
  buttonArrow: {
    color: colors.white,
    position: 'absolute',
    right: 18,
    fontSize: 20
  }
});
