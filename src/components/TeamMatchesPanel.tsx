import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Button from './Button';
import SportCardBackground from './SportCardBackground';
import { loadTeamMatches, matchError, type TeamMatch } from '../lib/matches';
import { colors } from '../theme/colors';
export default function TeamMatchesPanel({teamId}:{teamId:string}) {
 const [matches,setMatches]=useState<TeamMatch[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useFocusEffect(useCallback(()=>{let active=true;setLoading(true);void loadTeamMatches(teamId).then(data=>{if(active){setMatches(data);setError('');}}).catch(reason=>{if(active)setError(matchError(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[teamId]));
 return <ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Partidos y alineaciones</Text><Text style={styles.text}>Selecciona los 11 titulares antes de registrar las estadísticas. Todos sus minutos cuentan, aunque no tengan otros eventos.</Text><Button label="REGISTRAR PARTIDO · ELEGIR 11" onPress={()=>router.push({pathname:'/teams/match',params:{teamId}})}/>{loading&&<ActivityIndicator color={colors.red}/>}{!!error&&<Text accessibilityRole="alert" style={styles.text}>{error}</Text>}{!loading&&!error&&!matches.length&&<Text style={styles.text}>Todavía no hay partidos registrados.</Text>}{matches.map(match=><Pressable key={match.id} accessibilityRole="button" onPress={()=>router.push({pathname:'/teams/match',params:{teamId,matchId:match.id}})} style={styles.card}><SportCardBackground/><Text style={styles.label}>vs {match.opponent}</Text><Text style={styles.text}>{match.played_on} · {match.status==='draft'?'Borrador: completar estadísticas':`${match.goals_for} – ${match.goals_against} · Confirmado`}</Text></Pressable>)}</ScrollView>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:40},title:{color:colors.white,fontSize:24,fontWeight:'900'},text:{color:'#DED4D8',lineHeight:21,marginVertical:12},card:{padding:18,marginTop:12,borderTopLeftRadius:28,borderBottomRightRadius:28,borderTopRightRadius: 28,borderBottomLeftRadius: 28,overflow:'hidden'},label:{color:colors.white,fontSize:18,fontWeight:'800'}});
