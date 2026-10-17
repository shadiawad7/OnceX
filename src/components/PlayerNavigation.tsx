import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
const tabs: {label:string;icon:string;href:Href;path:string}[]=[
 {label:'Estadísticas',icon:'▤',href:'/dashboard/player',path:'/dashboard/player'},
 {label:'Equipos',icon:'👥',href:'/dashboard/player-teams',path:'/dashboard/player-teams'},
 {label:'Rankings',icon:'▥',href:'/rankings',path:'/rankings'},
 {label:'Partidos',icon:'⚽',href:'/dashboard/player-matches',path:'/dashboard/player-matches'},
];
export default function PlayerNavigation() {
 const pathname=usePathname();
 return <SafeAreaView edges={['bottom']} style={styles.safe}><View style={styles.bar}>{tabs.map(tab=> {const selected=pathname===tab.path || (tab.label==='Estadísticas' && pathname.startsWith('/players/')) || (tab.label==='Equipos' && (pathname.startsWith('/teams/') || pathname.startsWith('/coaches/')));return <Pressable key={tab.label} accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={tab.label} style={styles.tab} onPress={()=> {if(!selected)router.replace(tab.href);}}><Text style={[styles.icon,selected&&styles.active]}>{tab.icon}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label,selected&&styles.active]}>{tab.label}</Text>{selected&&<View style={styles.indicator}/>}</Pressable>;})}</View></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{backgroundColor:'#0C1116',flexShrink:0},bar:{flexDirection:'row',backgroundColor:'#0C1116',borderTopWidth:1,borderTopColor:'#39424B',paddingTop:8,paddingBottom:0,flexShrink:0},tab:{flex:1,minHeight:58,alignItems:'center',justifyContent:'center',paddingHorizontal:3},icon:{color:colors.white,fontSize:27,lineHeight:30},label:{color:'#C6CBD0',fontSize:10,fontWeight:'600',marginTop:5},active:{color:colors.redBright},indicator:{position:'absolute',bottom:0,width:20,height:2,borderRadius:1,backgroundColor:colors.red}});
