// One transport schema, using the existing match/appearance column names.
// Null means unreported, never an inferred zero. No scores, OVR or rankings here.
export const actionFields = ['goals','own_goals','assists','yellow_cards','red_cards'] as const;
export const performanceFields = ['minutes',...actionFields,'conceded_while_playing'] as const;
export type DraftPlayer = {
 mentioned_name:string; player_id:string|null; candidate_ids:string[];
 identity_status:'matched'|'needs_confirmation'; confidence:'high'|'medium'|'low';
 starter:boolean|null; minutes:number|null; goals:number|null; own_goals:number|null;
 assists:number|null; yellow_cards:number|null; red_cards:number|null; conceded_while_playing:number|null;
};
export type MatchDraft = {
 opponent:string|null; played_on:string|null; duration:number|null; venue:'home'|'away'|null;
 goals_for:number|null; goals_against:number|null; players:DraftPlayer[];
 missing_fields:string[]; warnings:string[];
};
export type DraftRosterPlayer = {player_id:string;player_name:string};
const nullableNumber={type:['integer','null']};
const properties={
 opponent:{type:['string','null']},played_on:{type:['string','null']},duration:nullableNumber,
 venue:{type:['string','null'],enum:['home','away',null]},goals_for:nullableNumber,goals_against:nullableNumber,
 players:{type:'array',items:{type:'object',additionalProperties:false,properties:{
  mentioned_name:{type:'string'},player_id:{type:['string','null']},candidate_ids:{type:'array',items:{type:'string'}},
  identity_status:{type:'string',enum:['matched','needs_confirmation']},confidence:{type:'string',enum:['high','medium','low']},
  starter:{type:['boolean','null']},...Object.fromEntries(performanceFields.map(key=>[key,nullableNumber])),
 },required:['mentioned_name','player_id','candidate_ids','identity_status','confidence','starter',...performanceFields]}},
 missing_fields:{type:'array',items:{type:'string'}},warnings:{type:'array',items:{type:'string'}},
};
export const matchDraftSchema={type:'object',additionalProperties:false,properties,required:Object.keys(properties)};
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function exactKeys(value:Record<string,unknown>,keys:string[]){return Object.keys(value).length===keys.length&&keys.every(key=>key in value);}
function strings(value:unknown,max:number):value is string[]{return Array.isArray(value)&&value.length<=max&&value.every(item=>typeof item==='string'&&item.length<=500);}
const integer=(value:unknown)=>value===null||(Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=10000);
export function validDraftDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
export function parseMatchDraft(value:unknown,roster:DraftRosterPlayer[]):MatchDraft {
 if(!record(value)||!exactKeys(value,Object.keys(properties)))throw new Error('Borrador de IA no válido.');
 if(!(value.opponent===null||(typeof value.opponent==='string'&&value.opponent.trim().length>0&&value.opponent.length<=120))||
  !(value.played_on===null||(typeof value.played_on==='string'&&validDraftDate(value.played_on)))||
  ![null,'home','away'].includes(value.venue as null)||!['duration','goals_for','goals_against'].every(key=>integer(value[key]))||
  !strings(value.missing_fields,100)||!strings(value.warnings,100)||!Array.isArray(value.players)||value.players.length>100)throw new Error('Borrador de IA no válido.');
 const ids=new Set(roster.map(player=>player.player_id));
 const keys=['mentioned_name','player_id','candidate_ids','identity_status','confidence','starter',...performanceFields];
 for(const player of value.players){
  if(!record(player)||!exactKeys(player,keys)||typeof player.mentioned_name!=='string'||player.mentioned_name.length>120||
   !(player.player_id===null||(typeof player.player_id==='string'&&ids.has(player.player_id)))||
   !strings(player.candidate_ids,100)||!player.candidate_ids.every(id=>ids.has(id))||
   !['matched','needs_confirmation'].includes(String(player.identity_status))||!['high','medium','low'].includes(String(player.confidence))||
   !(player.starter===null||typeof player.starter==='boolean')||!performanceFields.every(key=>integer(player[key])))throw new Error('La IA devolvió un jugador o unos datos no autorizados.');
 }
 // JSON-only schema: cloning this way also works on native JS engines without structuredClone.
 return JSON.parse(JSON.stringify(value)) as MatchDraft;
}
const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/[^a-z0-9 ]/g,' ').trim().replace(/\s+/g,' ');
// A fuzzy/model-only identification must always be selected by the coach.
export function requireIdentityConfirmation(draft:MatchDraft,roster:DraftRosterPlayer[],report?:string):MatchDraft{
 return {...draft,players:draft.players.map(player=>{
  const mention=normalize(player.mentioned_name);
  const exact=roster.filter(item=>normalize(item.player_name)===mention);
  const first=roster.filter(item=>normalize(item.player_name).split(' ')[0]===mention);
  const matches=exact.length?exact:first;
  const appearsInReport=report===undefined||(` ${normalize(report)} `).includes(` ${mention} `);
  if(mention&&appearsInReport&&player.identity_status==='matched'&&player.confidence==='high'&&matches.length===1&&matches[0].player_id===player.player_id)return player;
  return {...player,identity_status:'needs_confirmation',player_id:null,candidate_ids:[...new Set([...matches.map(p=>p.player_id),...player.candidate_ids,...(player.player_id?[player.player_id]:[])])]};
 })};
}
export function draftIssues(draft:MatchDraft):{missing:string[];warnings:string[]}{
 const missing:string[]=[],warnings:string[]=[];
 for(const key of ['opponent','played_on','duration','venue','goals_for','goals_against'] as const)if(draft[key]===null)missing.push(key);
 if(draft.duration!==null&&(draft.duration<1||draft.duration>150))warnings.push('La duración debe estar entre 1 y 150 minutos.');
 if([draft.goals_for,draft.goals_against].some(n=>n!==null&&n>99))warnings.push('El marcador no puede superar 99 goles.');
 const seen=new Set<string>();
 draft.players.forEach((player,index)=>{
  const label=player.mentioned_name||`Jugador ${index+1}`;
  if(!player.player_id||player.identity_status!=='matched')missing.push(`players.${index}.player_id`);
  if(player.player_id){if(seen.has(player.player_id))warnings.push(`${label}: jugador identificado dos veces; elimina o corrige una entrada.`);seen.add(player.player_id);}
  for(const key of ['starter',...performanceFields] as const)if(player[key]===null)missing.push(`players.${index}.${key}`);
  if(player.minutes!==null&&draft.duration!==null&&player.minutes>draft.duration)warnings.push(`${label}: los minutos superan la duración del partido.`);
  if(player.minutes===0&&actionFields.some(key=>(player[key]??0)>0))warnings.push(`${label}: tiene estadísticas pero figura con 0 minutos.`);
  if((player.yellow_cards??0)>2||(player.red_cards??0)>1)warnings.push(`${label}: máximo 2 amarillas y 1 roja.`);
  if(player.conceded_while_playing!==null&&draft.goals_against!==null&&player.conceded_while_playing>draft.goals_against)warnings.push(`${label}: encajados en juego superiores al marcador rival.`);
 });
 if(draft.players.filter(p=>p.starter===true).length!==11)missing.push('lineup.eleven_starters');
 if(draft.goals_for!==null){
  const goals=draft.players.reduce((sum,p)=>sum+(p.goals??0),0);
  if(goals>draft.goals_for||(draft.players.every(p=>p.goals!==null)&&goals!==draft.goals_for))warnings.push('Los goles de los jugadores no coinciden con el marcador. Puede faltar algún goleador.');
  if(draft.players.reduce((s,p)=>s+(p.assists??0),0)>draft.goals_for)warnings.push('Las asistencias superan los goles del equipo.');
 }
 return {missing,warnings};
}
