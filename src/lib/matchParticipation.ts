import type { MatchPlayer } from './matches';
export type MatchChange={outgoing:string;incoming:string|null;minute:number|null};
export type ConcededGoalTime={minute:number|null;order:'before'|'after'|null};

// Review-only timeline. Official points and clean-sheet rules stay in the existing backend.
export function reviewMatchParticipation(players:MatchPlayer[],duration:number,opponentGoals:number,changes:MatchChange[],goals:ConcededGoalTime[]):MatchPlayer[]{
 if(!Number.isInteger(duration)||duration<1||!Number.isInteger(opponentGoals)||opponentGoals<0||goals.length!==opponentGoals)throw new Error('Indica el minuto de cada gol encajado.');
 if(new Set(players.map(p=>p.slot_id)).size!==players.length||players.filter(p=>p.starter).length!==11)throw new Error('Revisa los 11 titulares de la alineación.');
 const validMinute=(minute:number|null)=>minute!==null&&Number.isInteger(minute)&&minute>=0&&minute<=duration;
 for(const change of changes){
  if(!validMinute(change.minute)||!change.outgoing||change.incoming==='')throw new Error('Completa quién sale, quién entra y el minuto de cada cambio.');
 }
 for(const goal of goals){
  if(!validMinute(goal.minute)||goal.minute===0)throw new Error('Completa los minutos de los goles encajados.');
  if(changes.some(change=>change.minute===goal.minute)&&!goal.order)throw new Error(`Hay un gol y un cambio en el minuto ${goal.minute}. Confirma si el gol fue antes o después del cambio.`);
 }
 const slots=new Map(players.map(p=>[p.slot_id,p]));
 const active=new Map(players.filter(p=>p.starter).map(p=>[p.slot_id,0]));
 const used=new Set(active.keys()),minutes=new Map(players.map(p=>[p.slot_id,0])),conceded=new Map(players.map(p=>[p.slot_id,0]));
 const linked=new Set<string>();
 const events=[...changes.map(change=>({minute:change.minute!,rank:1,change})),...goals.map(goal=>({minute:goal.minute!,rank:goal.order==='before'?0:2,change:null}))].sort((a,b)=>a.minute-b.minute||a.rank-b.rank);
 for(const event of events){
  if(event.change){
   const {outgoing,incoming}=event.change;
   if(!slots.has(outgoing)||!active.has(outgoing))throw new Error('El jugador que sale debe estar jugando en ese minuto.');
   if(incoming!==null&&(!slots.has(incoming)||used.has(incoming)||incoming===outgoing))throw new Error('El jugador que entra debe ser un suplente que todavía no haya participado.');
   minutes.set(outgoing,event.minute-active.get(outgoing)!);active.delete(outgoing);linked.add(outgoing);
   if(incoming!==null){active.set(incoming,event.minute);used.add(incoming);linked.add(incoming);}
  }else for(const id of active.keys())conceded.set(id,conceded.get(id)!+1);
 }
 for(const [id,start] of active)minutes.set(id,duration-start);
 return players.map(player=>{
  if(!linked.has(player.slot_id)&&((player.minutes!==null&&player.minutes!==(player.starter?duration:0))||(!player.starter&&player.minutes===null)))throw new Error(`Vincula el cambio de ${player.player_name} o revisa sus minutos antes de verificar los goles.`);
  return {...player,minutes:minutes.get(player.slot_id)!,conceded_while_playing:conceded.get(player.slot_id)!};
 });
}
export function participationFingerprint(players:MatchPlayer[],duration:number,opponentGoals:string){
 return JSON.stringify({duration,opponentGoals,players:players.map(p=>[p.slot_id,p.starter,p.minutes,p.conceded_while_playing,p.red_cards])});
}
