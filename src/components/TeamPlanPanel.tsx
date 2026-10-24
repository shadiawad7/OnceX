import TeamLicenceList from './TeamLicenceList';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SportCardBackground from './SportCardBackground';
import { oncexPlan } from '../data/oncexPlan';
import { colors } from '../theme/colors';

export default function TeamPlanPanel({id,editable}: { id: string; editable: boolean }) {
 return <ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.title}>ONCEX</Text>
  <Text style={styles.text}>Un único plan para todos los jugadores. Todas las funcionalidades incluidas.</Text>
  <View style={styles.card}><SportCardBackground/><Text style={styles.price}>3,99 € / jugador activo / mes</Text>
   {oncexPlan.features.map(feature=><Text key={feature} style={styles.feature}>✓ {feature}</Text>)}
  </View>
  <Text style={styles.text}>El club cobra a las familias y ONCEX factura al club según las licencias activas y facturables del periodo. Sin cuota fija por club.</Text>
  <Text style={styles.text}>Reparto comercial de referencia: 10% para el club y 90% para ONCEX.</Text>
  <Text style={styles.text}>Una baja durante el periodo mantiene la licencia facturable hasta su finalización y tiene efecto económico en el siguiente periodo.</Text>
  <Text style={styles.note}>Precio de referencia. Los pagos no están activados. El registro por audio y el análisis con IA están pendientes de integración.</Text>
  {!!id&&<TeamLicenceList teamId={id} editable={editable}/>}
 </ScrollView>;
}
const styles=StyleSheet.create({content:{padding:22,paddingBottom:40},title:{color:colors.white,fontSize:28,fontWeight:'900'},text:{color:'#E0D9DC',lineHeight:23,marginVertical:14},card:{borderRadius:28,overflow:'hidden',padding:22,marginVertical:12},price:{color:colors.white,fontSize:21,fontWeight:'900',marginBottom:18},feature:{color:colors.white,lineHeight:25,fontSize:13},note:{color:'#C3B8BE',fontSize:12,lineHeight:20,marginTop:12}});
