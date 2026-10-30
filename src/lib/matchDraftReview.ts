import type { MatchPlayer } from './matches';
import { actionFields, type MatchDraft } from '../../supabase/functions/_shared/matchDraft';

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
  const issue=draftReviewError(draft);if(issue)throw new Error(issue);
  if(draft.players.some(p=>!slots.some(slot=>slot.player_id===p.player_id)))throw new Error('Hay jugadores del borrador fuera de la alineación guardada. Revísala.');
 }
 return slots.map(slot=>{
  const pending=draft?.players.find(p=>p.player_id===slot.player_id);
  if(pending)return {...slot,minutes:pending.minutes,goals:pending.goals!,own_goals:pending.own_goals!,assists:pending.assists!,yellow_cards:pending.yellow_cards!,red_cards:pending.red_cards!,conceded_while_playing:pending.conceded_while_playing};
  return slot;
 });
}
