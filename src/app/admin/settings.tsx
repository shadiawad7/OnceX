import { ScrollView, StyleSheet, Text } from 'react-native';
import AdminShell from '../../components/AdminShell';
import PhotoBackgroundSetting from '../../components/PhotoBackgroundSetting';
import { colors } from '../../theme/colors';

export default function AdminSettings(){
 return <AdminShell fallback="/admin"><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.kicker}>ADMINISTRACIÓN ONCEX</Text>
  <Text style={styles.title}>Configuración</Text>
  <Text style={styles.description}>Ajustes globales de la plataforma. Solo el superadmin puede modificarlos.</Text>
  <PhotoBackgroundSetting/>
 </ScrollView></AdminShell>;
}
const styles=StyleSheet.create({content:{padding:22,paddingBottom:40},kicker:{color:colors.redBright,fontSize:10,fontWeight:'900',letterSpacing:2,marginBottom:10},title:{color:colors.white,fontSize:29,fontWeight:'900'},description:{color:'#DDD4D7',fontSize:14,lineHeight:22,marginTop:12,marginBottom:24}});
