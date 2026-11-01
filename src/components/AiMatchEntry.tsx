import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import { concededDuringAppearance } from '../lib/matchScoring';
import ProfilePortrait from './ProfilePortrait';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MatchVoiceInput from './MatchVoiceInput';
import { draftIssues, interpretMatch, performanceFields, type DraftPlayer, type MatchDraft } from '../lib/aiMatchDraft';
import type { HierarchyItem } from '../lib/hierarchy';
import { bindDraftToSavedLineup, draftReviewError, groupDraftPlayers, type SavedMatchDetails } from '../lib/matchDraftReview';
import type { MatchPlayer } from '../lib/matches';
import { colors } from '../theme/colors';
const labels={minutes:'Minutos',goals:'Goles',own_goals:'En propia',assists:'Asistencias',yellow_cards:'Amarillas',red_cards:'Rojas',conceded_while_playing:'Encajados en juego'};
export default function AiMatchEntry({teamId,roster,lineup,matchDetails,disabled,onApply}:{teamId:string;roster:HierarchyItem[];lineup:MatchPlayer[];matchDetails:SavedMatchDetails;disabled:boolean;onApply:(draft:MatchDraft,report:string)=>void}){
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[voiceBusy,setVoiceBusy]=useState(false);
 const [draft,setDraft]=useState<MatchDraft|null>(null),[error,setError]=useState(''),[picker,setPicker]=useState<number|null>(null),[search,setSearch]=useState('');
 const [source,setSource]=useState(''),[applied,setApplied]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const groups=draft?groupDraftPlayers(draft.players,true,{lineup,duration:matchDetails.duration??90}).map(group=>({...group,player:{...group.player,conceded_while_playing:concededDuringAppearance(group.player.minutes,matchDetails.duration??90,draft.goals_against,group.player.conceded_while_playing)}})):[];
 const lock=useRef(false);
 const input=useRef<ComponentRef<typeof TextInput>>(null);
 const locked=busy||voiceBusy||disabled;
 const issues=draft?draftIssues({...draft,players:groups.map(group=>group.player)}):null;
 function edit(next:MatchDraft){setDraft(bindDraftToSavedLineup(next,matchDetails,lineup));setApplied(false);setError('');}
 function updatePlayer(index:number,change:Partial<DraftPlayer>){if(draft){const indices=groups.find(group=>group.indices.includes(index))?.indices??[index];edit({...draft,players:draft.players.map((p,i)=>indices.includes(i)?{...p,...change}:p)});}}
 async function generate(){
  if(lock.current||locked||!text.trim())return;lock.current=true;setBusy(true);setError('');
  try{const result=await interpretMatch(teamId,text,roster);setDraft(bindDraftToSavedLineup(result,matchDetails,lineup));setSource(text);setApplied(false);setPicker(null);}catch(error){setError(error instanceof Error?error.message:'No se ha podido interpretar el partido.');}
  finally{lock.current=false;setBusy(false);}
 }
 function apply(){
  if(!draft)return;
  if(text!==source){setError('Has cambiado el relato. Genera un nuevo borrador antes de aplicarlo.');return;}
  if(groups.some(group=>Object.keys(group.conflicts).length)){setError('Hay datos distintos para el mismo jugador. Edítalos y confirma el valor correcto antes de aplicar.');return;}
  const reviewed={...draft,players:groups.map(group=>group.player)};
  const issue=draftReviewError(reviewed);if(issue){setError(issue);return;}
  if(draft.players.some(player=>!lineup.some(slot=>slot.player_id===player.player_id))){setError('Hay jugadores fuera de la alineación guardada. Corrige o elimina sus entradas; para incluirlos, modifica primero la alineación.');return;}
  try{onApply(reviewed,source);setApplied(true);}catch(error){setError(error instanceof Error?error.message:'No se ha podido aplicar el borrador.');}
 }
 return <View style={styles.panel}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} disabled={locked} onPress={()=>setOpen(!open)}><Text style={styles.title}>ASISTENTE IA · COMPLETAR ESTADÍSTICAS {open?'−':'+'}</Text><Text style={styles.hint}>Dicta o escribe el partido. Tú revisas y confirmas.</Text></Pressable>
  {open&&<>
   <Text style={styles.hint}>Envía solo datos del partido y nombres de la plantilla. El texto o audio se enviará a OpenAI para interpretarlo.</Text>
   <MatchVoiceInput teamId={teamId} roster={roster} disabled={busy||disabled} onBusy={setVoiceBusy} onError={(message,transcript)=>{setError(message);if(transcript)setText(transcript);}} onResult={(result,transcript)=>{setDraft(bindDraftToSavedLineup(result,matchDetails,lineup));setText(transcript);setSource(transcript);setApplied(false);setPicker(null);setError('');}}/>
   <Button secondary label="⌨ ESCRIBIR PARTIDO" disabled={locked} onPress={()=>input.current?.focus()}/>
   <Text style={styles.label}>Relato / transcripción editable</Text>
   <TextInput ref={input} accessibilityLabel="Relato o transcripción del partido" multiline value={text} onChangeText={setText} editable={!locked} maxLength={12000} placeholder="Jugamos contra el Valencia, fuera. Ganamos 3-1…" placeholderTextColor={colors.muted} style={[styles.input,styles.report]}/>
   <Button label={busy?'INTERPRETANDO…':'GENERAR BORRADOR'} disabled={locked||!text.trim()} onPress={()=>{void generate();}}/>
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
   {draft&&<View style={{gap:12,marginTop:18}}>
    <Text style={styles.title}>Borrador generado por IA — revisa los datos antes de confirmar.</Text>
    <Text style={styles.hint}>La alineación ya está guardada como borrador. Revisa las estadísticas; todavía no son oficiales. Se mantienen el rival, la fecha, la duración y los titulares seleccionados.</Text>
    <Text style={styles.hint}>La portería a cero y los puntos los calculará ONCEX con sus reglas actuales al confirmar el acta.</Text>
    {!!draft.warnings.length&&<Text style={styles.warning}>Observaciones del relato: {draft.warnings.join(' · ')}</Text>}
    {!!issues?.warnings.length&&<Text style={styles.warning}>{issues.warnings.join('\n')}</Text>}
    {!!issues?.missing.length&&<Text style={styles.hint}>Revisa los jugadores y las estadísticas antes de confirmar oficialmente.</Text>}
    <Text style={styles.hint}>{matchDetails.opponent} · {matchDetails.played_on} · {matchDetails.duration} min · {matchDetails.venue==='away'?'Visitante':'Local'}</Text>
    <View style={styles.row}>{(['goals_for','goals_against'] as const).map(key=><View key={key} style={styles.field}><Text style={styles.label}>{key==='goals_for'?'Goles del equipo':'Goles del rival'}</Text><TextInput accessibilityLabel={key==='goals_for'?'Goles del equipo en borrador':'Goles del rival en borrador'} value={draft[key]===null?'':String(draft[key])} editable={!locked} onChangeText={v=>{if(/^\d*$/.test(v))edit({...draft,[key]:v===''?null:Number(v)});}} keyboardType="number-pad" maxLength={2} style={styles.input}/></View>)}</View>
    {groups.map(({player,indices,conflicts})=>{const index=indices[0],key=player.identity_status==='matched'&&player.player_id?player.player_id:`pending-${index}`,person=roster.find(p=>p.id===player.player_id);return <View key={key} style={styles.player}>
     <View style={styles.brandRow}><Text style={styles.brand}>ONCEX</Text><Text style={styles.hint}>REVISIÓN IA</Text></View>
     <View style={styles.identity}><ProfilePortrait url={person?.photoUrl} name={person?.name??player.mentioned_name} style={styles.portrait}/><View style={{flex:1}}>
     <Text style={styles.label}>{roster.find(p=>p.id===player.player_id)?.name??player.mentioned_name??'Jugador pendiente'}</Text>
     <Text style={styles.hint}>{lineup.some(slot=>slot.player_id===player.player_id)?lineup.find(slot=>slot.player_id===player.player_id)?.starter?'Titular':'Suplente':'Identidad pendiente'} · {person?.position??'Identidad pendiente'}</Text></View></View>
     <View style={styles.summary}>{performanceFields.map(field=><View key={field} style={styles.summaryRow}><MaterialCommunityIcons name={field==='goals'||field==='own_goals'?'soccer':field==='minutes'?'timer-outline':field==='assists'?'shoe-cleat':field==='yellow_cards'||field==='red_cards'?'card':'shield-outline'} size={20} color={field==='yellow_cards'?'#FFD43B':field==='red_cards'||field==='own_goals'?'#FF496B':'#D5C3CE'}/><Text style={styles.summaryLabel}>{labels[field]}</Text><Text style={[styles.summaryValue,player[field]===null&&styles.pending]}>{conflicts[field]?'Revisar':player[field]??'Pendiente'}</Text></View>)}</View>
     {!!Object.keys(conflicts).length&&<Text style={styles.warning}>Datos por aclarar: {performanceFields.filter(field=>conflicts[field]).map(field=>`${labels[field]} (${conflicts[field]!.join(' / ')})`).join(' · ')}. Edita el valor correcto; no se suman automáticamente.</Text>}
     <Button secondary label={editing===key?'CERRAR EDICIÓN':'EDITAR DATOS'} disabled={locked} onPress={()=>setEditing(editing===key?null:key)}/>
     {(editing===key||player.identity_status!=='matched')&&<>
     <Button secondary label={player.identity_status==='matched'?'CAMBIAR JUGADOR':'ELEGIR JUGADOR · NEEDS_CONFIRMATION'} disabled={locked} onPress={()=>{setPicker(picker===index?null:index);setSearch('');}}/>
     {picker===index&&<>
      <TextInput accessibilityLabel="Buscar jugador de la plantilla" value={search} onChangeText={setSearch} placeholder="Buscar en la plantilla" placeholderTextColor={colors.muted} style={styles.input}/>
      {roster.filter(p=>lineup.some(slot=>slot.player_id===p.id)&&p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(p=><Pressable accessibilityRole="button" key={p.id} disabled={locked} onPress={()=>{updatePlayer(index,{player_id:p.id,identity_status:'matched',confidence:'high',candidate_ids:[]});setPicker(null);}} style={styles.chip}><Text style={styles.label}>{p.name}{player.candidate_ids.includes(p.id)?' · posible coincidencia':''}</Text></Pressable>)}
     </>}
     <Text style={styles.hint}>{lineup.find(slot=>slot.player_id===player.player_id)?.starter===true?'Titular de la alineación':lineup.some(slot=>slot.player_id===player.player_id)?'Suplente de la alineación':'Selecciona un jugador de la alineación'}</Text>
     <View style={styles.row}>{performanceFields.map(key=><View key={key} style={styles.field}><Text style={styles.hint}>{labels[key]}</Text><TextInput accessibilityLabel={`${labels[key]} de ${player.mentioned_name}`} value={player[key]===null?'':String(player[key])} onChangeText={v=>{if(/^\d*$/.test(v))updatePlayer(index,{[key]:v===''?null:Number(v)});}} keyboardType="number-pad" maxLength={3} editable={!locked} style={styles.input}/></View>)}</View>
     <Pressable accessibilityRole="button" disabled={locked} onPress={()=>{edit({...draft,players:draft.players.filter((_,i)=>!indices.includes(i))});setPicker(null);}}><Text style={styles.error}>{lineup.some(slot=>slot.player_id===player.player_id)?'Restablecer datos del jugador':'Eliminar esta entrada'}</Text></Pressable>
     </>}
    </View>;})}
    <Button secondary label="AÑADIR JUGADOR DE LA ALINEACIÓN" disabled={locked} onPress={()=>{const index=draft.players.length;edit({...draft,players:[...draft.players,{mentioned_name:'Jugador pendiente',player_id:null,candidate_ids:[],identity_status:'needs_confirmation',confidence:'low',starter:null,minutes:null,goals:null,own_goals:null,assists:null,yellow_cards:null,red_cards:null,conceded_while_playing:null}]});setPicker(index);setSearch('');}}/>
    <Text style={styles.hint}>Se muestran todos los jugadores de la alineación. Los titulares sin minutos indicados figuran con 90 min; las acciones no mencionadas, con 0. Revisa los cambios y completa los minutos de los suplentes que hayan entrado.</Text>
    <Button label="REVISADO · APLICAR ESTADÍSTICAS" disabled={locked} onPress={apply}/>
    {applied&&<Text style={styles.hint}>Estadísticas aplicadas al formulario inferior. Revísalas y confirma el acta solo cuando esté completa.</Text>}
   </View>}
  </>}
 </View>;
}
const styles=StyleSheet.create({
 panel:{backgroundColor:'#190D13',borderColor:'#692331',borderWidth:1,borderRadius:16,padding:16,marginBottom:20},
 title:{color:colors.white,fontSize:15,fontWeight:'800'},hint:{color:colors.muted,fontSize:12,lineHeight:18},
 label:{color:colors.white,fontSize:13,fontWeight:'700',marginTop:8},input:{backgroundColor:'#100C12',borderColor:colors.border,borderWidth:1,borderRadius:9,color:colors.white,padding:12,minHeight:46},
 report:{height:130,textAlignVertical:'top'},row:{flexDirection:'row',flexWrap:'wrap',gap:8},field:{flexGrow:1,flexBasis:'42%',gap:5},
 chip:{borderColor:colors.border,borderWidth:1,borderRadius:8,padding:10,marginTop:5},selected:{borderColor:colors.red,backgroundColor:'#46121E'},
 brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingBottom:10,borderBottomWidth:1,borderBottomColor:'#532030'},brand:{color:'#FFFFFF',fontSize:14,fontWeight:'900',letterSpacing:2},identity:{flexDirection:'row',alignItems:'center',gap:12},portrait:{width:56,height:70,borderRadius:10},summary:{borderWidth:1,borderColor:'#29232C',borderRadius:12,overflow:'hidden'},summaryRow:{flexDirection:'row',alignItems:'center',gap:8,padding:10,borderBottomWidth:1,borderBottomColor:'#29232C'},summaryLabel:{flex:1,color:'#E7DFE5',fontSize:13},summaryValue:{color:'#FFFFFF',fontSize:16,fontWeight:'800'},pending:{color:'#CDA7B4',fontSize:12},player:{padding:14,borderWidth:1,borderColor:'#A52643',backgroundColor:'#0B0D12',borderRadius:22,gap:12},error:{color:'#FF7E8D',marginTop:10,fontSize:13},warning:{color:'#F1CE8B',fontSize:12,lineHeight:18},
});
