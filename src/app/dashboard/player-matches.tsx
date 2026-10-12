import { StyleSheet, Text, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import { colors } from '../../theme/colors';
export default function PlayerMatches() {
 return <AccountShell allowed={['player']}>{()=> <View style={styles.content}><Text style={styles.title}>Partidos</Text><View style={styles.card}><Text style={styles.icon}>⚽</Text><Text style={styles.heading}>Tus partidos</Text><Text style={styles.text}>El registro de partidos todavía está pendiente. Aquí aparecerán las convocatorias y tus actuaciones.</Text></View></View>}</AccountShell>;
}
const styles=StyleSheet.create({content:{padding:20},title:{color:colors.white,fontSize:26,fontWeight:'900'},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:24,marginTop:24,alignItems:'center'},icon:{fontSize:36},heading:{color:colors.white,fontSize:18,fontWeight:'800',marginTop:16},text:{color:colors.muted,textAlign:'center',lineHeight:22,marginTop:12}});
