import { router } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import AccountShell from '../../components/AccountShell';
import PlayerRankings from '../../components/PlayerRankings';
import { colors } from '../../theme/colors';
export default function PlayerDashboard() { return <AccountShell allowed={['player']} fallback="/login">{account => <><Pressable accessibilityRole="button" style={styles.link} onPress={()=>router.push({pathname:'/players/[id]',params:{id:account.userId}})}><Text style={styles.text}>MI FICHA →</Text></Pressable><PlayerRankings canOpenProfiles={false}/></>}</AccountShell>; }
const styles=StyleSheet.create({link:{alignSelf:'flex-end',padding:16,paddingTop:0},text:{color:colors.redBright,fontWeight:'800',fontSize:12}});
