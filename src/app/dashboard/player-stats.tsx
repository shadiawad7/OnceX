import BlendedCardBackground from '../../components/BlendedCardBackground';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import { colors } from '../../theme/colors';
const stats=['Partidos','Minutos','Goles','Goles en propia','Asistencias','Amarillas','Rojas','Clean Sheets'];
export default function PlayerStats() {
 return <AccountShell allowed={['player']}>{()=> <ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Estadísticas</Text><Text style={styles.text}>Tus datos se calcularán a partir de las actuaciones registradas en los partidos.</Text><View style={styles.grid}>{stats.map(label=> <View key={label} style={styles.card}><BlendedCardBackground /><Text style={styles.value}>—</Text><Text style={styles.label}>{label}</Text></View>)}</View><Text style={styles.text}>Todavía no hay estadísticas de partidos disponibles.</Text></ScrollView>}</AccountShell>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:30},title:{color:colors.white,fontSize:26,fontWeight:'900'},text:{color:colors.muted,lineHeight:22,marginVertical:16},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'47%',backgroundColor:'transparent',borderWidth:0,borderColor:colors.border,borderRadius: 18,padding:22,alignItems:'center'},value:{color:colors.white,fontWeight:'900',fontSize:32},label:{color:colors.muted,fontSize:12,marginTop:8}});
