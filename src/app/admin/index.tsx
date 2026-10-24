import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import AdminShell from '../../components/AdminShell';
import SportCardBackground from '../../components/SportCardBackground';
import { colors } from '../../theme/colors';

const sections = [
 {title:'Usuarios',icon:'account-group-outline',caption:'CLUBES → EQUIPOS → ENTRENADORES → JUGADORES',description:'Organiza toda la estructura de ONCEX, crea cuentas y gestiona sus datos.',href:'/clubs',color:'#00FF66'},
 {title:'Planes',icon:'shield-star-outline',caption:'ONCEX · 3,99 €',description:'Un único plan con todas las funciones y licencias por jugador activo.',href:'/admin/team-plans',color:'#FFD43B'},
] as const;
export default function AdminHome() {
 return <AdminShell><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.kicker}>CENTRO DE CONTROL</Text><Text style={styles.title}>Administración ONCEX</Text>
  <Text style={styles.body}>Toda tu plataforma, en dos espacios.</Text>
  {sections.map(section=><Pressable key={section.title} accessibilityRole="button" onPress={()=>router.push(section.href)} style={styles.card}>
   <SportCardBackground/><View style={styles.row}><View style={[styles.icon,{borderColor:section.color}]}><MaterialCommunityIcons name={section.icon} size={30} color={section.color}/></View><MaterialCommunityIcons name="arrow-top-right" size={25} color={colors.white}/></View>
   <Text style={styles.label}>{section.title}</Text><Text style={styles.caption}>{section.caption}</Text><Text style={styles.description}>{section.description}</Text>
  </Pressable>)}
 </ScrollView></AdminShell>;
}
const styles=StyleSheet.create({content:{padding:22,paddingBottom:40},kicker:{color:colors.redBright,fontWeight:'900',fontSize:10,letterSpacing:2,marginBottom:10},title:{color:colors.white,fontSize:29,fontWeight:'900'},body:{color:'#DDD4D7',lineHeight:22,marginTop:12,marginBottom:24},card:{padding:24,marginBottom:20,borderTopLeftRadius:32,borderBottomRightRadius:32,borderTopRightRadius:7,borderBottomLeftRadius:7,overflow:'hidden'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},icon:{width:58,height:58,borderRadius:29,borderWidth:1,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,0,0,0.3)'},label:{color:colors.white,fontWeight:'900',fontSize:28,marginTop:20},caption:{color:'#F0C4CD',fontSize:9,lineHeight:17,fontWeight:'800',marginTop:8},description:{color:'#DED8DC',fontSize:13,lineHeight:21,marginTop:10}});
