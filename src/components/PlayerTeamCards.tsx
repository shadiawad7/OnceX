import ClubBadge from './ClubBadge';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { client } from '../lib/hierarchy';
import { listPages } from '../lib/listPages';
import { clubPhotoUrls } from '../lib/clubPhotos';
import { adminError } from '../lib/admin';
import Button from './Button';
import { colors } from '../theme/colors';
type Team={id:string;name:string;category:string;plan_code?:string;clubs:{name:string;photo_path?:string|null}|null;photo_url?:string};
export default function PlayerTeamCards() {
 const [teams,setTeams]=useState<Team[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=> {let active=true;setLoading(true);setError('');
  void (async()=> {
   const all=await listPages(async page=> {
    const query=(photos:boolean)=>client().from('teams').select(`id,name,category${photos?',plan_code':''},clubs(name${photos?',photo_path':''})`,{count:'exact'}).order('name').order('id').range(page*20,page*20+19);
    let result=await query(true);
    if(result.error&&['42703','PGRST204'].includes(result.error.code))result=await query(false);
    if(result.error)throw result.error;
    return {items:result.data as unknown as Team[],count:result.count??0};
   },()=>active);
   const urls=await clubPhotoUrls(all.items.map(team=>team.clubs?.photo_path??''));
   if(active)setTeams(all.items.map(team=>({...team,photo_url:urls.get(team.clubs?.photo_path??'')})));
  })().catch(reason=>{if(active)setError(adminError(reason));}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 // A retry intentionally reloads the focused list.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[retry]));
 return <FlatList data={loading?[]:teams} keyExtractor={team=>team.id} contentContainerStyle={styles.content} ListHeaderComponent={<><Text style={styles.eyebrow}>TU CLUB · TU EQUIPO</Text><Text style={styles.title}>Mis equipos</Text><Text style={styles.subtitle}>Tu club, tu equipo y la categoría en la que juegas.</Text>{!loading&&!error&&<Text style={styles.count}>{teams.length} {teams.length===1?'equipo':'equipos'} asignados</Text>}{loading&&<ActivityIndicator color={colors.red}/>}
{!!error&&<><Text style={styles.subtitle}>{error}</Text><Button label="REINTENTAR" onPress={()=>setRetry(value=>value+1)}/></>}</>} ListEmptyComponent={!loading&&!error?<Text style={styles.subtitle}>Todavía no tienes equipos asignados.</Text>:null} renderItem={({item})=><TeamCard key={item.photo_url??item.id} team={item}/>}/>;
}
function TeamCard({team}:{team:Team}) {
 return <View style={styles.card}>
  <View style={styles.cover}><LinearGradient colors={['#6A1729','#151C25','#060B11']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill}><View style={styles.field}><View style={styles.fieldLine}/><View style={styles.fieldCircle}/></View></LinearGradient>
   <LinearGradient colors={['transparent','rgba(7,10,15,0.92)']} style={StyleSheet.absoluteFill}/><Text style={styles.tag}>MI EQUIPO</Text><View style={styles.badge}><ClubBadge key={team.photo_url} url={team.photo_url} name={team.clubs?.name??'Club'} size={80}/></View><View style={styles.coverText}><Text style={styles.club}>{team.clubs?.name??'Mi club'}</Text><Text style={styles.team}>{team.name}</Text></View>
  </View><View style={styles.footer}><View style={styles.info}><Text style={styles.label}>PLAN {(team.plan_code??'basic').toUpperCase()}</Text><Text style={styles.label}>CATEGORÍA</Text><Text style={styles.category}>{team.category||'Sin categoría asignada'}</Text></View></View>
 </View>;
}
const styles=StyleSheet.create({content:{padding:20,paddingBottom:32},eyebrow:{color:colors.redBright,fontSize:10,fontWeight:'900',letterSpacing:1.5},title:{color:colors.white,fontSize:30,fontWeight:'900',marginTop:8},subtitle:{color:colors.muted,lineHeight:21,marginVertical:12},count:{color:'#E8C8CE',fontSize:12,marginBottom:8},card:{borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:'#57313D',backgroundColor:'#10151C',marginTop:18},cover:{height:188,overflow:'hidden'},tag:{position:'absolute',top:16,left:16,color:colors.white,fontSize:9,fontWeight:'900',letterSpacing:1,backgroundColor:'#CC152A',paddingVertical:7,paddingHorizontal:10,borderRadius:8},badge:{position:'absolute',top:64,left:18},coverText:{position:'absolute',bottom:44,left:110,right:18},club:{color:'#F2C8D0',fontSize:12,fontWeight:'700'},team:{color:colors.white,fontSize:25,fontWeight:'900',marginTop:5},footer:{padding:18,flexDirection:'row',alignItems:'center',gap:12},info:{flex:1},label:{color:colors.muted,fontSize:9,letterSpacing:1,fontWeight:'800'},category:{color:colors.white,fontSize:13,lineHeight:19,marginTop:5},action:{color:colors.redBright,fontSize:9,fontWeight:'900',marginTop:14,letterSpacing:0.5},arrow:{width:40,height:40,borderRadius:20,backgroundColor:'#39121E',alignItems:'center',justifyContent:'center'},arrowText:{color:colors.redBright,fontSize:24},field:{position:'absolute',width:'70%',height:130,top:25,right:-20,borderWidth:1,borderColor:'rgba(255,255,255,0.15)',transform:[{rotate:'-15deg'}]},fieldLine:{position:'absolute',left:'50%',height:'100%',width:1,backgroundColor:'rgba(255,255,255,0.15)'},fieldCircle:{position:'absolute',left:'38%',top:35,width:60,height:60,borderRadius:30,borderWidth:1,borderColor:'rgba(255,255,255,0.15)'}});
