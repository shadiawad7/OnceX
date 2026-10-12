import { router } from 'expo-router';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import PlayerRankings from '../../components/PlayerRankings';
import { colors } from '../../theme/colors';

export default function PlayerDashboard() {
  return <AccountShell allowed={['player']} fallback="/login">{account => <View style={styles.page}>
    <Pressable accessibilityRole="button" style={styles.link} onPress={()=>router.push({pathname:'/players/[id]',params:{id:account.userId}})}>
      <Text style={styles.text}>MI FICHA →</Text>
    </Pressable>
    <PlayerRankings canOpenProfiles={false}/>

  </View>}</AccountShell>;
}

const styles=StyleSheet.create({
  page:{flex:1},
  link:{alignSelf:'flex-end',paddingHorizontal:20,paddingTop:0,paddingBottom:4},
  text:{color:colors.redBright,fontWeight:'800',fontSize:12},
});
