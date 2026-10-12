import { router } from 'expo-router';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import PlayerRankings from '../../components/PlayerRankings';
import { colors } from '../../theme/colors';

const navigation = [
  { label: 'Inicio', icon: '⌂', route: '/dashboard/player' as const },
  { label: 'Mi perfil', icon: '●', route: '/players/[id]' as const },
  { label: 'Rankings', icon: '▥', route: '/rankings' as const },
];

export default function PlayerDashboard() {
  return <AccountShell allowed={['player']} fallback="/login">{account => <View style={styles.page}>
    <Pressable accessibilityRole="button" style={styles.link} onPress={()=>router.push({pathname:'/players/[id]',params:{id:account.userId}})}>
      <Text style={styles.text}>MI FICHA →</Text>
    </Pressable>
    <PlayerRankings canOpenProfiles={false}/>
    <View accessibilityRole="tablist" style={styles.nav}>
      {navigation.map(item => {
        const active = item.label === 'Rankings';
        return <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{selected: active}} style={styles.navItem} onPress={() => router.push(item.route === '/players/[id]' ? {pathname:item.route,params:{id:account.userId}} : item.route)}>
          <Text style={[styles.navIcon, active && styles.active]}>{item.icon}</Text>
          <Text style={[styles.navLabel, active && styles.active]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  </View>}</AccountShell>;
}

const styles=StyleSheet.create({
  page:{flex:1},
  link:{alignSelf:'flex-end',paddingHorizontal:20,paddingTop:0,paddingBottom:4},
  text:{color:colors.redBright,fontWeight:'800',fontSize:12},
  nav:{flexDirection:'row',marginHorizontal:14,marginBottom:10,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:'rgba(255,70,82,0.2)',backgroundColor:'rgba(20,8,13,0.92)'},
  navItem:{flex:1,alignItems:'center',gap:3,paddingVertical:4},
  navIcon:{color:'#F1E7E9',fontSize:21,fontWeight:'800'},
  navLabel:{color:'#D7B7BC',fontSize:10,fontWeight:'700'},
  active:{color:colors.redBright},
});
