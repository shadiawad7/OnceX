import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

export default function SportCardBackground() {
  return <LinearGradient pointerEvents="none" colors={['rgba(108, 20, 33, 0.7)', 'rgba(20, 6, 10, 0.5)', 'rgba(20, 6, 10, 0)']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.fill} />;
}
const styles = StyleSheet.create({fill:{position:'absolute',top:0,bottom:0,left:0,right:0}});
