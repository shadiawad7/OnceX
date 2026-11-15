import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FederationGroupBrowser from './FederationGroupBrowser';
import type { FederationGroup } from '../lib/federationCatalog';
export default function TeamFederationFields({name,value,onChange,disabled,allowUnlinked=false,unlinked=false,onUnlinkedChange}:{name:string;value:FederationGroup|null;onChange:(group:FederationGroup)=>void;disabled:boolean;allowUnlinked?:boolean;unlinked?:boolean;onUnlinkedChange?:(unlinked:boolean)=>void}){
 const [open,setOpen]=useState(false);
 const ownTeam=value?.teams.find(team=>team.id===value.ownTeamId);
 return <View style={styles.section}>
  <Text style={styles.heading}>Competición del equipo</Text>
  {value&&!unlinked?<View style={styles.summary}>{[['Temporada',value.seasonCode],['Competición',value.competitionName],['Grupo',value.groupName],['Equipo federativo',ownTeam?.name??'']].map(([label,text])=><View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{text}</Text></View>)}<Text style={styles.label}>{value.teams.length-1} rivales con sus escudos</Text></View>:!unlinked&&<Text style={styles.label}>Selecciona temporada, competición, grupo y tu equipo en la FFCV.</Text>}
  {!unlinked&&<Pressable accessibilityRole="button" disabled={disabled} onPress={()=>setOpen(true)} style={styles.control}><Text style={styles.action}>{value?'CAMBIAR COMPETICIÓN FFCV':'ELEGIR TEMPORADA, COMPETICIÓN Y GRUPO'}</Text></Pressable>}
  {allowUnlinked&&<Pressable accessibilityRole="checkbox" accessibilityState={{checked:unlinked,disabled}} disabled={disabled} onPress={()=>onUnlinkedChange?.(!unlinked)} style={styles.unlinked}><Text style={styles.label}>{unlinked?'☑':'☐'} Sin competición federada · rivales manuales</Text></Pressable>}
  {open&&<FederationGroupBrowser teamName={name} sourceUrl={value?.sourceUrl} onClose={()=>setOpen(false)} onSave={async group=>{onChange(group);}}/>}
 </View>;
}
const styles=StyleSheet.create({section:{gap:10,marginVertical:18,padding:14,borderRadius:14,borderWidth:1,borderColor:'#59303F',backgroundColor:'#150E15'},heading:{color:'#FFF',fontSize:16,fontWeight:'800'},summary:{gap:10},row:{gap:3},label:{color:'#BFAFB8',fontSize:12,lineHeight:18},value:{color:'#FFF',fontSize:14,fontWeight:'700'},control:{borderWidth:1,borderColor:'#A73350',borderRadius:10,padding:13,minHeight:48,justifyContent:'center'},action:{color:'#FF9EB2',fontSize:12,fontWeight:'800'},unlinked:{minHeight:44,justifyContent:'center'}});
