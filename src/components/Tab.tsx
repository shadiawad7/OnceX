import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
export default function Tab({
  icon,
  label,
  active = false
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return <View style={styles.tab}><Text style={[styles.tabIcon, active && styles.tabActive]}>{icon}</Text><Text style={[styles.tabLabel, active && styles.tabActive]}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  tab: {
    alignItems: 'center',
    minWidth: 60
  },
  tabIcon: {
    color: colors.dim,
    fontSize: 23,
    lineHeight: 26
  },
  tabActive: {
    color: colors.redBright
  },
  tabLabel: {
    color: colors.dim,
    fontSize: 10,
    marginTop: 5,
    fontWeight: '700'
  }
});
