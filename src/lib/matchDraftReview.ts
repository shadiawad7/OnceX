import type { MatchPlayer } from './matches';
import { actionFields, performanceFields, type MatchDraft } from '../../supabase/functions/_shared/matchDraft';

export function draftReviewError(draft:MatchDraft):string{
 if(draft.players.some(p=>!p.player_id||p.identity_status!=='matched'))return 'Selecciona los jugadores pendientes o elimina sus entradas.';
 if(new Set(draft.players.map(p=>p.player_id)).size!==draft.players.length)return 'Hay un jugador repetido. Corrige o elimina una entrada.';
 if(draft.players.some(p=>actionFields.some(field=>p[field]===null)))return 'Completa las acciones pendientes o confirma expresamente que las no mencionadas son 0.';
 return '';
}

// Bind reviewed identities to slots returned by the existing lineup RPC.
// The server remains the source of truth for starter status and player identity.
export function applyDraftAppearances(slots:MatchPlayer[],draft:MatchDraft|null):MatchPlayer[]{
 if(!draft)return slots;
 if(draft){
  if(draft.players.some(p=>!slots.some(slot=>slot.player_id===p.player_id)))throw new Error('Hay jugadores del borrador fuera de la alineación guardada. Revísala.');
  const issue=draftReviewError(draft);if(issue)throw new Error(issue);
 }
 return slots.map(slot=>{
  const pending=draft?.players.find(p=>p.player_id===slot.player_id);
  if(pending)return {...slot,minutes:pending.minutes,goals:pending.goals!,own_goals:pending.own_goals!,assists:pending.assists!,yellow_cards:pending.yellow_cards!,red_cards:pending.red_cards!,conceded_while_playing:pending.conceded_while_playing};
  return slot;
 });
}

// The saved lineup and match details remain authoritative when AI fills the acta.
export type SavedMatchDetails = Pick<MatchDraft,'opponent'|'played_on'|'duration'|'venue'>;
export function bindDraftToSavedLineup(draft:MatchDraft,details:SavedMatchDetails,slots:MatchPlayer[]):MatchDraft{
 const differs=(Object.keys(details) as (keyof SavedMatchDetails)[]).some(key=>draft[key]!==null&&draft[key]!==details[key]);
 const players=draft.players.map(player=>({...player,starter:slots.find(slot=>slot.player_id===player.player_id)?.starter??null}));
 for(const slot of slots){
  if(!slot.player_id||players.some(player=>player.player_id===slot.player_id))continue;
  // Empty mention denotes an existing lineup player absent from the report.
  // Keep inferred defaults out of the raw facts so later identity resolution cannot conflict with them.
  players.push({mentioned_name:'',player_id:slot.player_id,candidate_ids:[],identity_status:'matched',confidence:'high',starter:slot.starter,
   minutes:slot.minutes,goals:slot.goals||null,own_goals:slot.own_goals||null,assists:slot.assists||null,
   yellow_cards:slot.yellow_cards||null,red_cards:slot.red_cards||null,conceded_while_playing:slot.conceded_while_playing??null});
 }
 return {...draft,...details,players,
  warnings:[...new Set([...draft.warnings,...(differs?['El relato difiere de los datos guardados del partido. Se mantienen los datos de la alineación.']:[])])]};
}

// Merge complementary facts, never add repeated totals or choose between contradictions.
export function groupDraftPlayers(players:MatchDraft['players'],unreportedAsZero=false,lineupContext?:{lineup:MatchPlayer[];duration:number}){
 const groups:{player:MatchDraft['players'][number];indices:number[];conflicts:Partial<Record<(typeof performanceFields)[number],number[]>>}[]=[];
 for(const [index,player] of players.entries()){
  const existing=player.player_id&&player.identity_status==='matched'?groups.find(group=>group.player.player_id===player.player_id&&group.player.identity_status==='matched'):undefined;
  if(existing)existing.indices.push(index);else groups.push({player:{...player},indices:[index],conflicts:{}});
 }
 for(const group of groups){
  for(const field of ['minutes',...actionFields,'conceded_while_playing'] as const){
   const values=[...new Set(group.indices.map(i=>players[i][field]).filter((value):value is number=>value!==null))];
   group.player[field]=values.length===1?values[0]:values.length===0&&unreportedAsZero?0:null;
   if(field==='minutes'&&values.length===0&&unreportedAsZero&&lineupContext){
    const slot=lineupContext.lineup.find(item=>item.player_id===group.player.player_id);
    const mentioned=group.indices.some(i=>players[i].mentioned_name.trim().length>0);
    group.player.minutes=slot?.minutes??(slot?.starter?lineupContext.duration:slot&&!mentioned?0:null);
   }
   if(values.length>1)group.conflicts[field]=values;
  }
 }
 return groups;
}
