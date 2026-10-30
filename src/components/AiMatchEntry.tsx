import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import MatchVoiceInput from './MatchVoiceInput';
import MatchDateCalendar from './MatchDateCalendar';
import { actionFields, draftIssues, interpretMatch, performanceFields, type DraftPlayer, type MatchDraft } from '../lib/aiMatchDraft';
import type { HierarchyItem } from '../lib/hierarchy';
import { draftReviewError } from '../lib/matchDraftReview';
import { colors } from '../theme/colors';
const labels={minutes:'Minutos',goals:'Goles',own_goals:'En propia',assists:'Asistencias',yellow_cards:'Amarillas',red_cards:'Rojas',conceded_while_playing:'Encajados en juego'};
export default function AiMatchEntry({teamId,roster,disabled,onApply}:{teamId:string;roster:HierarchyItem[];disabled:boolean;onApply:(draft:MatchDraft,report:string)=>void}){
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[busy,setBusy]=useState(false),[voiceBusy,setVoiceBusy]=useState(false);
 const [draft,setDraft]=useState<MatchDraft|null>(null),[error,setError]=useState(''),[picker,setPicker]=useState<number|null>(null),[search,setSearch]=useState('');
 const [source,setSource]=useState(''),[applied,setApplied]=useState(false);
 const lock=useRef(false);
 const input=useRef<ComponentRef<typeof TextInput>>(null);
 const locked=busy||voiceBusy||disabled;
 const issues=draft?draftIssues(draft):null;
 function edit(next:MatchDraft){setDraft(next);setApplied(false);setError('');}
 function updatePlayer(index:number,change:Partial<DraftPlayer>){if(draft)edit({...draft,players:draft.players.map((p,i)=>i===index?{...p,...change}:p)});}
 async function generate(){
  if(lock.current||locked||!text.trim())return;lock.current=true;setBusy(true);setError('');
  try{const result=await interpretMatch(teamId,text,roster);setDraft(result);setSource(text);setApplied(false);setPicker(null);}catch(error){setError(error instanceof Error?error.message:'No se ha podido interpretar el partido.');}
  finally{lock.current=false;setBusy(false);}
 }
 function apply(){
  if(!draft)return;
  if(text!==source){setError('Has cambiado el relato. Genera un nuevo borrador antes de aplicarlo.');return;}
  const issue=draftReviewError(draft);if(issue){setError(issue);return;}
  onApply(draft,source);setApplied(true);
 }
 return <View style={styles.panel}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} disabled={locked} onPress={()=>setOpen(!open)}><Text style={styles.title}>ASISTENTE IA · PREPARAR PARTIDO {open?'−':'+'}</Text><Text style={styles.hint}>Dicta o escribe el partido. Tú revisas y confirmas.</Text></Pressable>
  {open&&<>
   <Text style={styles.hint}>Envía solo datos del partido y nombres de la plantilla. El texto o audio se enviará a OpenAI para interpretarlo.</Text>
   <MatchVoiceInput teamId={teamId} roster={roster} disabled={busy||disabled} onBusy={setVoiceBusy} onError={(message,transcript)=>{setError(message);if(transcript)setText(transcript);}} onResult={(result,transcript)=>{setDraft(result);setText(transcript);setSource(transcript);setApplied(false);setPicker(null);setError('');}}/>
   <Button secondary label="⌨ ESCRIBIR PARTIDO" disabled={locked} onPress={()=>input.current?.focus()}/>
   <Text style={styles.label}>Relato / transcripción editable</Text>
   <TextInput ref={input} accessibilityLabel="Relato o transcripción del partido" multiline value={text} onChangeText={setText} editable={!locked} maxLength={12000} placeholder="Jugamos contra el Valencia, fuera. Ganamos 3-1…" placeholderTextColor={colors.muted} style={[styles.input,styles.report]}/>
   <Button label={busy?'INTERPRETANDO…':'GENERAR BORRADOR'} disabled={locked||!text.trim()} onPress={()=>{void generate();}}/>
   {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
   {draft&&<View style={{gap:12,marginTop:18}}>
    <Text style={styles.title}>Borrador generado por IA — revisa los datos antes de confirmar.</Text>
    <Text style={styles.hint}>Los campos vacíos son desconocidos. Aún no se ha guardado ningún dato del partido. Después completarás los 11 titulares y revisarás el acta habitual.</Text>
    <Text style={styles.hint}>La portería a cero y los puntos los calculará ONCEX con sus reglas actuales al confirmar el acta.</Text>
    {!!draft.warnings.length&&<Text style={styles.warning}>Observaciones del relato: {draft.warnings.join(' · ')}</Text>}
    {!!issues?.warnings.length&&<Text style={styles.warning}>{issues.warnings.join('\n')}</Text>}
    {!!issues?.missing.length&&<Text style={styles.hint}>Hay datos pendientes: completa los campos vacíos y la alineación antes de confirmar oficialmente.</Text>}
    <Text style={styles.label}>Rival</Text><TextInput accessibilityLabel="Rival del borrador" value={draft.opponent??''} onChangeText={v=>edit({...draft,opponent:v.trim()?v:null})} maxLength={120} editable={!locked} style={styles.input}/>
    <Text style={styles.label}>Fecha</Text><MatchDateCalendar value={draft.played_on??''} disabled={locked} onChange={v=>edit({...draft,played_on:v})}/>
    <Text style={styles.label}>Duración (minutos)</Text><TextInput accessibilityLabel="Duración del borrador" value={draft.duration===null?'':String(draft.duration)} onChangeText={v=>{if(/^\d*$/.test(v))edit({...draft,duration:v===''?null:Number(v)});}} keyboardType="number-pad" maxLength={3} editable={!locked} style={styles.input}/>
    <View style={styles.row}>{(['home','away'] as const).map(v=><Pressable key={v} disabled={locked} accessibilityRole="radio" accessibilityState={{checked:draft.venue===v}} onPress={()=>edit({...draft,venue:v})} style={[styles.chip,draft.venue===v&&styles.selected]}><Text style={styles.label}>{v==='home'?'LOCAL':'VISITANTE'}</Text></Pressable>)}</View>
    <View style={styles.row}>{(['goals_for','goals_against'] as const).map(key=><View key={key} style={styles.field}><Text style={styles.label}>{key==='goals_for'?'Goles del equipo':'Goles del rival'}</Text><TextInput accessibilityLabel={key==='goals_for'?'Goles del equipo en borrador':'Goles del rival en borrador'} value={draft[key]===null?'':String(draft[key])} editable={!locked} onChangeText={v=>{if(/^\d*$/.test(v))edit({...draft,[key]:v===''?null:Number(v)});}} keyboardType="number-pad" maxLength={2} style={styles.input}/></View>)}</View>
    {draft.players.map((player,index)=><View key={index} style={styles.player}>
     <Text style={styles.label}>{roster.find(p=>p.id===player.player_id)?.name??player.mentioned_name??'Jugador pendiente'}</Text>
     <Button secondary label={player.identity_status==='matched'?'CAMBIAR JUGADOR':'ELEGIR JUGADOR · NEEDS_CONFIRMATION'} disabled={locked} onPress={()=>{setPicker(picker===index?null:index);setSearch('');}}/>
     {picker===index&&<>
      <TextInput accessibilityLabel="Buscar jugador de la plantilla" value={search} onChangeText={setSearch} placeholder="Buscar en la plantilla" placeholderTextColor={colors.muted} style={styles.input}/>
      {roster.filter(p=>p.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))).map(p=><Pressable accessibilityRole="button" key={p.id} disabled={locked} onPress={()=>{updatePlayer(index,{player_id:p.id,identity_status:'matched',confidence:'high',candidate_ids:[]});setPicker(null);}} style={styles.chip}><Text style={styles.label}>{p.name}{player.candidate_ids.includes(p.id)?' · posible coincidencia':''}</Text></Pressable>)}
     </>}
     <View style={styles.row}>{([true,false,null] as const).map((v,i)=><Pressable accessibilityRole="radio" accessibilityState={{checked:player.starter===v}} key={i} disabled={locked} onPress={()=>updatePlayer(index,{starter:v})} style={[styles.chip,player.starter===v&&styles.selected]}><Text style={styles.hint}>{v===null?'Sin definir':v?'Titular':'Suplente'}</Text></Pressable>)}</View>
     <View style={styles.row}>{performanceFields.map(key=><View key={key} style={styles.field}><Text style={styles.hint}>{labels[key]}</Text><TextInput accessibilityLabel={`${labels[key]} de ${player.mentioned_name}`} value={player[key]===null?'':String(player[key])} onChangeText={v=>{if(/^\d*$/.test(v))updatePlayer(index,{[key]:v===''?null:Number(v)});}} keyboardType="number-pad" maxLength={3} editable={!locked} style={styles.input}/></View>)}</View>
     <Pressable accessibilityRole="button" disabled={locked} onPress={()=>{edit({...draft,players:draft.players.filter((_,i)=>i!==index)});setPicker(null);}}><Text style={styles.error}>Eliminar esta entrada</Text></Pressable>
    </View>)}
    <Button secondary label="AÑADIR JUGADOR DE LA PLANTILLA" disabled={locked} onPress={()=>{const index=draft.players.length;edit({...draft,players:[...draft.players,{mentioned_name:'Jugador pendiente',player_id:null,candidate_ids:[],identity_status:'needs_confirmation',confidence:'low',starter:null,minutes:null,goals:null,own_goals:null,assists:null,yellow_cards:null,red_cards:null,conceded_while_playing:null}]});setPicker(index);setSearch('');}}/>
    <Button secondary label="CONFIRMAR ACCIONES NO MENCIONADAS = 0" disabled={locked} onPress={()=>edit({...draft,players:draft.players.map(p=>({...p,...Object.fromEntries(actionFields.map(key=>[key,p[key]??0]))}))})}/>
    <Text style={styles.hint}>Esta opción solo completa goles, goles en propia, asistencias y tarjetas. Nunca inventa minutos, titulares ni goles encajados.</Text>
    <Button label="REVISADO · PASAR A ALINEACIÓN" disabled={locked} onPress={apply}/>
    {applied&&<Text style={styles.hint}>Borrador aplicado al formulario inferior. Selecciona los 11 titulares; el guardado oficial llegará al confirmar el acta.</Text>}
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
 player:{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,gap:10},error:{color:'#FF7E8D',marginTop:10,fontSize:13},warning:{color:'#F1CE8B',fontSize:12,lineHeight:18},
});
