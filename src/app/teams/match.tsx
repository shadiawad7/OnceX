import FederationOpponentPicker from '../../components/FederationOpponentPicker';
import { useFederationCatalog } from '../../hooks/useFederationCatalog';
import { opponentBadgeUrl } from '../../lib/federationCatalog';
import { toggleCallup, toggleLineupStarter, lineupSubstitutes } from '../../lib/matchLineupSelection';
import MatchPlayerDisclosure from '../../components/MatchPlayerDisclosure';
import MatchParticipationReview from '../../components/MatchParticipationReview';
import { participationFingerprint } from '../../lib/matchParticipation';
import MatchResultsReview from '../../components/MatchResultsReview';
import AiMatchEntry from '../../components/AiMatchEntry';
import { applyDraftAppearances } from '../../lib/matchDraftReview';
import InputStepGuard from '../../components/InputStepGuard';
import { matchEntryStepError } from '../../lib/matchEntrySteps';
import ClubBadge from '../../components/ClubBadge';
import { clubPhotoUrls } from '../../lib/clubPhotos';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { matchStatisticsError } from '../../lib/matchValidation';
import ErrorDialog from '../../components/ErrorDialog';
import { seasonForMatchDate } from '../../lib/matchSeason';
import MatchDateCalendar from '../../components/MatchDateCalendar';
import { liveMatchPointBreakdown, concededDuringAppearance, type ScoringPosition } from '../../lib/matchScoring';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AccountShell from '../../components/AccountShell';
import Button from '../../components/Button';
import SportCardBackground from '../../components/SportCardBackground';
import { client, listTeamPeople, type HierarchyItem } from '../../lib/hierarchy';
import { listPages } from '../../lib/listPages';
import { loadMatchSummary, matchError, type MatchPlayer, type TeamMatch } from '../../lib/matches';
import { colors } from '../../theme/colors';
const fields=[{key:'minutes',label:'Minutos'},{key:'goals',label:'Goles'},{key:'own_goals',label:'Goles en propia'},{key:'assists',label:'Asistencias'},{key:'yellow_cards',label:'Amarillas'},{key:'red_cards',label:'Rojas'},{key:'conceded_while_playing',label:'Goles encajados en juego'}] as const;
export default function MatchEditorPage(){const {teamId,matchId,edit}=useLocalSearchParams<{teamId:string;matchId?:string;edit?:string}>();return <AccountShell allowed={['coach','club_admin','super_admin']} fallback={{pathname:'/teams/[id]',params:{id:teamId}}}>{()=> <MatchEditor key={`${teamId}-${matchId??''}-${edit??''}`} teamId={teamId} matchId={matchId} editRequested={edit==='1'}/>}</AccountShell>}
function MatchEditor({teamId,matchId,editRequested=false}:{teamId:string;matchId?:string;editRequested?:boolean}){
 const [participationReview,setParticipationReview]=useState<string|null>(null),[scoringReady,setScoringReady]=useState(false);
 const [correcting,setCorrecting]=useState(false),[reason,setReason]=useState('');
 const [aiReport,setAiReport]=useState(''),[reviewVersion,setReviewVersion]=useState(0);
 const [roster,setRoster]=useState<HierarchyItem[]>([]),[starters,setStarters]=useState<string[]>([]),[calledUp,setCalledUp]=useState<string[]>([]);
 const [lineupStep,setLineupStep]=useState<'squad'|'starters'>('squad');
 const scroll=useRef<ComponentRef<typeof ScrollView>>(null);
 const subs=lineupSubstitutes(calledUp,starters);
 const [venue,setVenue]=useState<'home'|'away'|null>(null);
 const [teamName,setTeamName]=useState('');
 const [clubBadgeUrl,setClubBadgeUrl]=useState<string>();
 const [opponent,setOpponent]=useState(''),[date,setDate]=useState('');
 const [savedId,setSavedId]=useState(matchId),[stage,setStage]=useState<'lineup'|'stats'>('lineup'),[players,setPlayers]=useState<MatchPlayer[]>([]);
 const [match,setMatch]=useState<TeamMatch|null>(null),[goalsFor,setGoalsFor]=useState(''),[goalsAgainst,setGoalsAgainst]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false); 
 const [error,setErrorMessage]=useState(''),[errorVisible,setErrorVisible]=useState(false);
 const setError=useCallback((message:string)=>{setErrorMessage(message);setErrorVisible(!!message);},[]);
 // New matches always last 90 minutes; existing actas retain their saved duration.
 const duration=String(match?.duration??90);
 const participationKey=participationFingerprint(players,+duration,goalsAgainst);
 const participationVerified=participationReview===participationKey;
 const season=seasonForMatchDate(date);
 const federation=useFederationCatalog(teamId,season);
 const rivalBadge=opponentBadgeUrl(federation.catalog,opponent);

 useEffect(()=>{let active=true;void (async()=>{
  const team=await client().from('teams').select('clubs(name,photo_path)').eq('id',teamId).single();if(team.error)throw team.error;const club=team.data.clubs as unknown as {name:string;photo_path:string|null}|null;if(active)setTeamName(club?.name??'Club sin nombre');
  const badgeUrls=await clubPhotoUrls(club?.photo_path?[club.photo_path]:[]);if(active)setClubBadgeUrl(badgeUrls.get(club?.photo_path??''));
  const people=await listPages(page=>listTeamPeople(teamId,['player'],page,'',undefined,{photos:false,jerseyNumbers:true}),()=>active);
  const data=matchId?await loadMatchSummary(matchId):null;
  if(!active)return;
  const rule=await client().rpc('match_clean_sheet_minimum');if(!active)return;setScoringReady(!rule.error&&rule.data===60);
  setRoster(people.items);
  if(data){if(data.match.team_id!==teamId)throw new Error('Este partido pertenece a otro equipo.');setCorrecting(editRequested&&data.match.status==='confirmed');setMatch(data.match);setVenue(data.match.venue??null);setPlayers(data.players);setOpponent(data.match.opponent);setDate(data.match.played_on);setStarters(data.players.filter(p=>p.starter&&p.player_id).map(p=>p.player_id!));setCalledUp(data.players.filter(p=>p.player_id).map(p=>p.player_id!));setGoalsFor(data.match.goals_for==null?'':String(data.match.goals_for));setGoalsAgainst(data.match.goals_against==null?'':String(data.match.goals_against));setStage('stats');}
 })().catch(reason=>{if(active)setError(matchError(reason));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[teamId,matchId,editRequested,setError]);
 function toggleStarter(id:string){setError('');try{setStarters(toggleLineupStarter(calledUp,starters,id));}catch(reason){setError(reason instanceof Error?reason.message:'Revisa los titulares.');}}
 function toggleConvoked(id:string){const next=toggleCallup(calledUp,starters,id);setCalledUp(next.calledUp);setStarters(next.starters);setError('');}
 function showLineupStep(next:'squad'|'starters'){setLineupStep(next);setError('');scroll.current?.scrollTo({y:0,animated:true});}
 async function saveLineup(){
  if(busy)return;
  if(!venue){setError('Indica si el club juega como local o visitante.');return;}
  if(starters.length!==11){setError('No puedes registrar estadísticas: selecciona los 11 titulares.');return;}
  if(!roster.some(player=>starters.includes(player.id)&&player.position==='Portero')){setError('Los 11 titulares deben incluir al menos un portero.');return;}
  if(!opponent.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(date)){setError('Completa el rival y elige la fecha del partido.');return;}
  setBusy(true);setError('');try{const result=await client().rpc('save_match_lineup_v2',{match_venue:venue,target_team:teamId,target_match:savedId??null,opponent_name:opponent.trim(),match_date:date,match_duration:+duration,starter_ids:starters,substitute_ids:subs});if(result.error)throw result.error;const id=result.data as string;setSavedId(id);const data=await loadMatchSummary(id);setMatch(data.match);setVenue(data.match.venue??null);setPlayers(data.players);setAiReport('');setStage('stats');}catch(reason){setError(matchError(reason));}finally{setBusy(false);}
 }
 function concededFor(player:MatchPlayer):number|null{
  if(!readOnly&&+goalsAgainst>0&&!participationVerified&&player.minutes!==0&&player.minutes!==+duration)return null;
  return concededDuringAppearance(player.minutes,+duration,/^\d+$/.test(goalsAgainst)?+goalsAgainst:null,player.conceded_while_playing);
 }
 function validate(){
  const stepError=matchEntryStepError(venue,goalsFor,goalsAgainst,'statistics');
  if(stepError)return stepError;
  if(+goalsAgainst>0&&!participationVerified)return 'Verifica primero los minutos de los goles encajados y los cambios.';
  if(!season)return 'Elige una fecha válida para el partido.';
  if(!players.some(p=>p.starter&&p.player_position==='Portero'))return 'Los 11 titulares deben incluir al menos un portero.';
  if(players.filter(p=>p.starter).length!==11)return 'Faltan los 11 titulares.';
  if(!/^\d+$/.test(goalsFor)||!/^\d+$/.test(goalsAgainst))return 'Introduce el resultado del partido.';
  const statisticsIssue=matchStatisticsError(players,+goalsFor,+goalsAgainst,+duration);
  if(statisticsIssue)return statisticsIssue;
  if(players.some(p=>concededFor(p)==null||concededFor(p)!<0||concededFor(p)!>+goalsAgainst))return 'Indica los goles encajados durante la participación de cada jugador.';
  return '';
 }

 async function finalize(){if(busy||!confirm||!savedId)return;if(!scoringReady){setError('La regla de portería a cero de 60 minutos aún no está activada en el servidor. No se puede confirmar el acta hasta actualizarla.');setConfirm(false);return;}const issue=validate();if(issue){setError(issue);setConfirm(false);return;}setBusy(true);setError('');try{const result=await client().rpc('confirm_match_statistics_v3',{match_venue:venue,target_match:savedId,expected_revision:match?.revision??0,match_season:season,correction_reason:correcting?(reason.trim()?'Revisión: '+reason.trim():'Revisión de resultados por el entrenador'):null,team_goals:+goalsFor,opponent_goals:+goalsAgainst,performances:players.map(player=>({slot_id:player.slot_id,minutes:player.minutes,goals:player.goals,own_goals:player.own_goals,assists:player.assists,yellow_cards:player.yellow_cards,red_cards:player.red_cards,conceded_while_playing:concededFor(player)}))});if(result.error)throw result.error;setConfirm(false);setCorrecting(false);router.dismissTo({pathname:'/teams/[id]',params:{id:teamId,section:'matches'}});}catch(reason){setConfirm(false);setError(matchError(reason));}finally{setBusy(false);}}
 const readOnly=match?.status==='confirmed'&&!correcting;
 async function editResults(){
  if(busy)return;
  if(readOnly&&savedId){
   setBusy(true);
   try{
    const data=await loadMatchSummary(savedId);
    setMatch(data.match);setPlayers(data.players);
    setVenue(data.match.venue??null);
    setGoalsFor(data.match.goals_for==null?'':String(data.match.goals_for));
    setGoalsAgainst(data.match.goals_against==null?'':String(data.match.goals_against));
    setOpponent(data.match.opponent);setDate(data.match.played_on);
    setCorrecting(true);
   }catch(error){setConfirm(false);setError(matchError(error));return;}
   finally{setBusy(false);}
  }
  // Draft reviews already contain the entered values: only close the review.
  setConfirm(false);setStage('stats');setError('');
 }
 function previewBreakdown(player:MatchPlayer):ReturnType<typeof liveMatchPointBreakdown>|null{
  try{return liveMatchPointBreakdown({venue,position:player.player_position as ScoringPosition,duration:+duration,minutes:player.minutes,goals:player.goals,ownGoals:player.own_goals,assists:player.assists,yellowCards:player.yellow_cards,redCards:player.red_cards,teamGoals:/^\d+$/.test(goalsFor)?+goalsFor:null,opponentGoals:/^\d+$/.test(goalsAgainst)?+goalsAgainst:null,concededWhilePlaying:concededFor(player)});}catch{return null;}
 }

 function previewPoints(player:MatchPlayer):number|null{return readOnly?player.oncex_points??null:previewBreakdown(player)?.total??null;}
 if(loading)return <ActivityIndicator color={colors.red}/>;
 return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
  <Text style={styles.title}>{stage==='lineup'?(lineupStep==='squad'?'Convocatoria':'Once inicial'):correcting?'Corregir acta':readOnly?'Partido confirmado':'Actuaciones del partido'}</Text>
  {!!aiReport&&<View style={styles.card}><Text style={styles.name}>Borrador generado por IA — revisa antes de confirmar</Text></View>}
  <MatchResultsReview visible={confirm} players={players.map(player=>({...player,oncex_points:previewPoints(player),clean_sheet:readOnly?player.clean_sheet:previewBreakdown(player)?.cleanSheet??null,points_breakdown:readOnly?player.points_breakdown:previewBreakdown(player)}))} subtitle={venue==='away'?`${opponent} ${goalsAgainst} – ${goalsFor} ${teamName}`:`${teamName} ${goalsFor} – ${goalsAgainst} ${opponent}`} readOnly={readOnly} busy={busy} onClose={()=>setConfirm(false)} onEdit={()=>{void editResults();}} onConfirm={()=>{void finalize();}}/>
  <ErrorDialog visible={errorVisible} message={error} onClose={()=>setErrorVisible(false)}/>
  <View style={styles.stepHeading}><Text style={styles.stepNumber}>1</Text><View style={{flex:1}}><Text style={styles.stepTitle}>Condición del partido</Text></View></View>
  <View style={styles.venueChoices}>{([{value:'home',label:'LOCAL'},{value:'away',label:'VISITANTE'}] as const).map(option=><Pressable key={option.value} accessibilityRole="radio" accessibilityState={{checked:venue===option.value,disabled:busy||readOnly||confirm}} disabled={busy||readOnly||confirm} onPress={()=>setVenue(option.value)} style={[styles.venueChoice,venue===option.value&&styles.venueSelected]}><Text style={[styles.venueLabel,venue===option.value&&styles.venueLabelSelected]}>{option.label}</Text>{venue===option.value&&<View style={styles.venueIndicator}/>}</Pressable>)}</View>
  {stage==='lineup'?<InputStepGuard message={matchEntryStepError(venue,goalsFor,goalsAgainst,'details')} onAttempt={setError}>
   <Text style={styles.label}>Rival</Text><FederationOpponentPicker catalog={federation.catalog} value={opponent} disabled={busy} onChange={setOpponent}/>{!!federation.error&&<Text style={styles.error}>{federation.error}</Text>}
   <Text style={styles.label}>Fecha del partido</Text><MatchDateCalendar value={date} onChange={setDate} disabled={busy}/>
   <View style={styles.lineupTabs}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:lineupStep==='squad'}} disabled={busy} onPress={()=>showLineupStep('squad')} style={[styles.lineupTab,lineupStep==='squad'&&styles.selected]}><Text style={styles.choiceText}>1 · Convocados ({calledUp.length})</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{selected:lineupStep==='starters',disabled:busy||calledUp.length<11}} disabled={busy||calledUp.length<11} onPress={()=>showLineupStep('starters')} style={[styles.lineupTab,lineupStep==='starters'&&styles.selected]}><Text style={styles.choiceText}>2 · Titulares ({starters.length}/11)</Text></Pressable>
   </View>
   <Text style={styles.counter}>{lineupStep==='squad'?`${calledUp.length} CONVOCADOS`:`${starters.length} / 11 TITULARES · ${subs.length} SUPLENTES`}</Text>
   {roster.length<11&&<Text style={styles.error}>Necesitas al menos 11 jugadores en la plantilla.</Text>}
   <View style={styles.rosterList}>{roster.filter(player=>lineupStep==='squad'||calledUp.includes(player.id)).map(player=>{
    const selected=lineupStep==='squad'?calledUp.includes(player.id):starters.includes(player.id);
    return <Pressable key={player.id} accessibilityRole="checkbox" accessibilityLabel={`${player.name}, dorsal ${player.jerseyNumber??'sin asignar'}`} accessibilityState={{checked:selected,disabled:busy}} disabled={busy} onPress={()=>lineupStep==='squad'?toggleConvoked(player.id):toggleStarter(player.id)} style={[styles.rosterRow,selected&&styles.rosterRowSelected]}>
     <Text maxFontSizeMultiplier={1.4} style={styles.jersey}>{player.jerseyNumber??'—'}</Text><Text style={styles.rosterName}>{player.name}</Text>
     {lineupStep==='starters'&&!selected&&<Text style={styles.subLabel}>Suplente</Text>}
     <MaterialCommunityIcons name={selected?'checkbox-marked-circle':'checkbox-blank-circle-outline'} size={23} color={selected?colors.redBright:'#82737C'}/>
    </Pressable>;
   })}</View>
   {lineupStep==='squad'?<Button label="ELEGIR LOS 11 TITULARES →" disabled={busy||calledUp.length<11} onPress={()=>showLineupStep('starters')}/>:<>
    <Button label={busy?'GUARDANDO…':'GUARDAR ALINEACIÓN Y CONTINUAR'} disabled={busy||starters.length!==11} onPress={()=>{void saveLineup();}}/>
    <Button secondary label="VOLVER A CONVOCADOS" disabled={busy} onPress={()=>showLineupStep('squad')}/>
   </>}
  </InputStepGuard>:<>
   <Text style={styles.text}>vs {opponent} · {date} · {duration} min</Text>
   {savedId&&!readOnly&&!correcting&&<AiMatchEntry key={savedId} teamId={teamId} roster={roster} lineup={players} matchDetails={{opponent,played_on:date,duration:+duration,venue}} disabled={busy||confirm} onApply={(draft,report)=>{
    const reviewed=applyDraftAppearances(players,draft);
    setPlayers(reviewed);setAiReport(report);setReviewVersion(value=>value+1);setParticipationReview(null);
    if(draft.goals_for!==null)setGoalsFor(String(draft.goals_for));
    if(draft.goals_against!==null)setGoalsAgainst(String(draft.goals_against));
    setError('');
   }}/>}
   {readOnly&&<Button secondary label="CORREGIR DATOS OFICIALES" disabled={busy} onPress={()=>{void editResults();}}/>}
   {correcting&&<><Text style={styles.label}>Motivo de la corrección (opcional)</Text><TextInput accessibilityLabel="Motivo de la corrección" value={reason} onChangeText={setReason} editable={!busy&&!confirm} multiline maxLength={1000} style={styles.input}/></>}
   <InputStepGuard message={readOnly?'':matchEntryStepError(venue,goalsFor,goalsAgainst,'result')} onAttempt={setError}><View style={styles.scoreboard}>
    <SportCardBackground/>
    <View style={styles.scoreboardHeader}><View style={styles.scoreboardHeading}><MaterialCommunityIcons name="scoreboard-outline" size={18} color={colors.redBright}/><Text style={styles.scoreboardTitle}>2 · MARCADOR FINAL</Text></View><View style={styles.scoreboardStatus}><Text style={styles.scoreboardStatusText}>{readOnly?'CONFIRMADO':'RESULTADO'}</Text></View></View>
    <View style={[styles.result,venue==='away'&&styles.visitorOnRight]}>
     <View style={styles.resultTeam}>
      <View style={[styles.teamEmblem,styles.ownEmblem]}><ClubBadge key={clubBadgeUrl??teamName} url={clubBadgeUrl} name={teamName} size={46}/></View>
      <Text style={styles.teamCaption}>{venue==='home'?'LOCAL':venue==='away'?'VISITANTE':'TU CLUB'}</Text><Text style={styles.resultName}>{teamName}</Text>
      <TextInput accessibilityLabel={`Goles de ${teamName}`} value={goalsFor} onChangeText={value=>setGoalsFor(value.replace(/\D/g,''))} keyboardType="number-pad" maxLength={2} placeholder="—" placeholderTextColor="#776671" editable={!busy&&!readOnly&&!confirm} style={[styles.resultInput,styles.ownScore]}/>
     </View>
     <View style={styles.versus}><View style={styles.versusLine}/><Text style={styles.versusText}>VS</Text><View style={styles.versusLine}/></View>
     <View style={styles.resultTeam}>
      <View style={styles.teamEmblem}>{rivalBadge?<ClubBadge key={rivalBadge} url={rivalBadge} name={opponent} size={46}/>:<MaterialCommunityIcons name="shield-outline" size={27} color="#DDD2DB"/>}</View>
      <Text style={styles.teamCaption}>{venue==='home'?'VISITANTE':venue==='away'?'LOCAL':'RIVAL'}</Text><Text style={styles.resultName}>{opponent}</Text>
      <TextInput accessibilityLabel={`Goles de ${opponent}`} value={goalsAgainst} onChangeText={value=>setGoalsAgainst(value.replace(/\D/g,''))} keyboardType="number-pad" maxLength={2} placeholder="—" placeholderTextColor="#776671" editable={!busy&&!readOnly&&!confirm} style={styles.resultInput}/>
     </View>
    </View>
   </View></InputStepGuard>
   {!readOnly&&/^\d+$/.test(goalsAgainst)&&+goalsAgainst<=99&&<MatchParticipationReview key={savedId} players={players} duration={+duration} opponentGoals={+goalsAgainst} disabled={busy||confirm} verified={participationVerified} onInvalidate={()=>setParticipationReview(null)} onVerified={reviewed=>{setPlayers(reviewed);setParticipationReview(participationFingerprint(reviewed,+duration,goalsAgainst));setError('');}}/>}
   <View style={styles.stepHeading}><Text style={styles.stepNumber}>3</Text><View style={{flex:1}}><Text style={styles.stepTitle}>Estadísticas de los jugadores</Text></View></View>
   <MatchPlayerDisclosure key={reviewVersion} name="Jugadores de la alineación" detail={`${players.length} jugadores · ${players.some(player=>player.minutes===null)?'Hay minutos pendientes':'Toca para revisar o corregir'}`} attention={players.some(player=>player.minutes===null)}>
   <InputStepGuard message={readOnly?'':matchEntryStepError(venue,goalsFor,goalsAgainst,'statistics')} onAttempt={setError}>
   {!readOnly&&<><View style={styles.noChanges}><Button secondary label="SIN CAMBIOS · TITULARES JUGARON TODO" disabled={busy||confirm} onPress={()=>setPlayers(players.map(p=>({...p,minutes:p.starter?+duration:0,conceded_while_playing:p.starter&&/^\d+$/.test(goalsAgainst)?+goalsAgainst:p.starter?null:0})))}/></View></>}
   {players.map(player=><MatchPlayerDisclosure key={player.slot_id} name={player.player_name} detail={`${player.starter?'Titular':'Suplente'} · ${player.minutes??'—'} min · ${player.goals} goles · ${player.assists} asistencias`} attention={player.minutes===null}>
<View style={styles.fields}>{fields.map(field=><View key={field.key} style={styles.field}><Text style={styles.fieldLabel}>{field.label}</Text><TextInput accessibilityLabel={`${field.label} de ${player.player_name}`} value={field.key==='conceded_while_playing'?String((readOnly?player.conceded_while_playing:concededFor(player))??''):player[field.key]==null?'':String(player[field.key])} keyboardType="number-pad" editable={!busy&&!readOnly&&!confirm&&field.key!=='conceded_while_playing'} onChangeText={text=>{if(!/^\d*$/.test(text))return;setPlayers(players.map(p=>p.slot_id===player.slot_id?{...p,...(field.key==='minutes'?{conceded_while_playing:null}:{}),[field.key]:text===''?(field.key==='minutes'||field.key==='conceded_while_playing'?null:0):Number(text)}:p));}} style={styles.input}/></View>)}<View style={styles.field}><Text style={styles.fieldLabel}>Puntos ONCEX del partido{readOnly?'':' · provisional'}</Text><View style={[styles.input,styles.livePoints]}><Text accessibilityLiveRegion="polite" accessibilityLabel={`Total de puntos del partido de ${player.player_name}: ${previewPoints(player)??'pendiente de completar datos'}`} style={styles.livePointsValue}>{previewPoints(player)??'—'}</Text></View></View></View></MatchPlayerDisclosure>)}
   </InputStepGuard>
   </MatchPlayerDisclosure>
   {readOnly&&<Button secondary label="RESULTADOS →" disabled={busy} onPress={()=>setConfirm(true)}/>}
   {correcting&&<Button secondary label="CANCELAR CORRECCIÓN" disabled={busy} onPress={()=>{if(savedId)void loadMatchSummary(savedId).then(data=>{setMatch(data.match);setVenue(data.match.venue??null);setPlayers(data.players);setGoalsFor(String(data.match.goals_for??''));setGoalsAgainst(String(data.match.goals_against??''));setCorrecting(false);setConfirm(false);setReason('');}).catch(reason=>setError(matchError(reason)));}}/>}
   {!readOnly&&<><Button label="RESULTADOS →" disabled={busy} onPress={()=>{const issue=validate();setError(issue);if(!issue)setConfirm(true);}}/>{!correcting&&<Button secondary label="MODIFICAR ALINEACIÓN" disabled={busy} onPress={()=>{setStage('lineup');showLineupStep('squad');}}/>}</>}
  </>}
 </ScrollView>;
}
const styles=StyleSheet.create({lineupTabs:{flexDirection:'row',gap:8,marginTop:22},lineupTab:{flex:1,minHeight:46,padding:8,borderWidth:1,borderColor:'#61404E',borderRadius:10,alignItems:'center',justifyContent:'center'},rosterList:{borderWidth:1,borderColor:'#3A2932',borderRadius:12,overflow:'hidden',marginTop:12,marginBottom:18},rosterRow:{minHeight:52,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,paddingVertical:9,borderBottomWidth:0.5,borderBottomColor:'#36232D',backgroundColor:'#100E14'},rosterRowSelected:{backgroundColor:'#291019'},jersey:{width:30,textAlign:'center',color:'#FFB0BF',fontSize:16,fontWeight:'800'},rosterName:{flex:1,color:'#FFF',fontSize:14,fontWeight:'600'},subLabel:{color:'#AA99A3',fontSize:10},stepHeading:{flexDirection:'row',alignItems:'center',gap:10,marginTop:20,marginBottom:12},stepNumber:{width:26,height:26,borderRadius:13,borderWidth:1,borderColor:'#A34458',color:'#FFB1C0',textAlign:'center',lineHeight:24,fontSize:12,fontWeight:'900'},stepTitle:{color:'#FFFFFF',fontSize:14,fontWeight:'800'},stepHint:{color:'#BDAAB3',fontSize:11,lineHeight:16,marginTop:4},venueChoices:{flexDirection:'row',padding:4,borderRadius:14,borderWidth:1,borderColor:'rgba(205,172,188,0.2)',backgroundColor:'rgba(8,8,13,0.85)',marginBottom:10,gap:4},venueChoice:{flex:1,minWidth:0,minHeight:52,alignItems:'center',justifyContent:'center',borderRadius:10,position:'relative'},venueSelected:{backgroundColor:'rgba(180,25,55,0.2)'},venueLabel:{color:'#AC9AA4',fontSize:12,fontWeight:'900',letterSpacing:1.5},venueLabelSelected:{color:'#FFFFFF'},venueIndicator:{position:'absolute',bottom:5,width:28,height:2,borderRadius:1,backgroundColor:'#FF496D'},content:{padding:20,paddingBottom:40},title:{color:colors.white,fontSize:25,fontWeight:'900'},text:{color:'#E0D5DA',fontSize:12,lineHeight:20,marginVertical:8},label:{color:colors.white,fontSize:13,fontWeight:'800',marginTop:16,marginBottom:8},input:{backgroundColor:'rgba(8,8,12,0.8)',borderColor:'#59404B',borderWidth:1,borderRadius:10,padding:12,color:colors.white,minHeight:44},counter:{color:colors.redBright,fontSize:20,fontWeight:'900',marginTop:24},error:{color:'#FFB4B9',lineHeight:21,marginVertical:12},card:{padding:16,marginBottom:12,borderTopLeftRadius:28,borderBottomRightRadius:28,borderTopRightRadius: 28,borderBottomLeftRadius: 28,overflow:'hidden'},person:{flexDirection:'row',alignItems:'center',gap:12},name:{flexShrink:1,color:colors.white,fontSize:15,fontWeight:'800'},buttons:{flexDirection:'row',gap:10,marginTop:12},choice:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#61404E',borderRadius:12},selected:{backgroundColor:colors.red,borderColor:colors.redBright},choiceText:{color:colors.white,fontWeight:'800'},fields:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:16},field:{flexBasis:'45%',flexGrow:1,minWidth:0,justifyContent:'flex-end'},fieldLabel:{color:'#E5D9DE',fontSize:11,lineHeight:14,marginBottom:2},livePoints:{borderColor:colors.redBright,justifyContent:'center'},livePointsValue:{color:colors.white,fontSize:15,fontWeight:'900'},noChanges:{marginTop:16,marginBottom:24},scoreboard:{borderRadius:24,borderWidth:1,borderColor:'rgba(255,95,126,0.28)',overflow:'hidden',padding:18,marginTop:20,marginBottom:22},scoreboardHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.09)'},scoreboardHeading:{flexDirection:'row',alignItems:'center',gap:7,flex:1},scoreboardTitle:{color:'#F1E7ED',fontSize:10,fontWeight:'900',letterSpacing:1},scoreboardStatus:{paddingHorizontal:7,paddingVertical:5,borderRadius:6,backgroundColor:'rgba(255,75,105,0.12)'},scoreboardStatusText:{color:'#FF9DB0',fontSize:8,fontWeight:'900',letterSpacing:0.5},result:{flexDirection:'row',gap:10,alignItems:'stretch',marginTop:20},visitorOnRight:{flexDirection:'row-reverse'},resultTeam:{flex:1,minWidth:0,alignItems:'center'},teamEmblem:{width:48,height:48,borderRadius:16,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(229,212,225,0.25)',backgroundColor:'rgba(255,255,255,0.04)',marginBottom:9},ownEmblem:{borderColor:'rgba(255,72,102,0.4)',backgroundColor:'rgba(255,55,90,0.08)'},teamCaption:{color:'#C4A9B7',fontSize:8,fontWeight:'800',letterSpacing:1.3,marginBottom:5},resultName:{color:colors.white,fontSize:13,lineHeight:18,fontWeight:'800',textAlign:'center',minHeight:40,marginBottom:14},versus:{width:22,alignItems:'center',justifyContent:'center',gap:10},versusLine:{width:1,height:24,backgroundColor:'rgba(255,90,120,0.23)'},versusText:{color:'#BFA8B4',fontSize:9,fontWeight:'900',letterSpacing:1},resultInput:{width:'100%',height:78,marginTop:'auto',textAlign:'center',fontSize:38,fontWeight:'900',fontVariant:['tabular-nums'],color:'#FFFFFF',backgroundColor:'rgba(4,4,9,0.65)',borderWidth:1,borderColor:'rgba(217,192,208,0.3)',borderRadius:16,padding:10},ownScore:{borderColor:'rgba(255,72,102,0.6)'}});
