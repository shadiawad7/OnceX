import { client } from './client';
import { profilePhotoUrls } from './profilePhotos';
export type TeamMatch={id:string;team_id:string;opponent:string;played_on:string;duration:number;goals_for:number|null;goals_against:number|null;status:'draft'|'confirmed';venue?:'home'|'away'|null;revision?:number;season_code?:string|null};
export type MatchPlayer={slot_id:string;player_id:string|null;player_name:string;player_position:string;starter:boolean;minutes:number|null;goals:number;own_goals:number;assists:number;yellow_cards:number;red_cards:number;clean_sheet:boolean|null;oncex_points?:number|null;conceded_while_playing?:number|null;points_breakdown?:{version:string;parts:Record<string,number>;total:number}|null;scoring_version?:string;photo_path?:string|null;photoUrl?:string};
export type MatchSummary={match:TeamMatch;players:MatchPlayer[]};
export function matchError(reason:unknown):string {
 const error=reason as {code?:string;message?:string};
 if(error?.message?.includes('confirm_match_statistics_v3')||error?.message?.includes('save_match_lineup_v2'))return 'Activa la migración 202610230002_away_win_bonus.sql para registrar Local / Visitante y el nuevo bonus.';
 if(error?.message?.includes('confirm_match_statistics_v2'))return 'Activa la migración 202610210002_match_scoring_v2.sql para confirmar con las nuevas reglas.';
 if(['PGRST202','42883','42P01'].includes(error?.code??''))return 'Activa la migración 202610200001_match_lineups.sql en Supabase para registrar alineaciones y partidos.';
 return error?.message||'No se ha podido cargar el partido. Inténtalo de nuevo.';
}
export async function loadTeamMatches(teamId:string):Promise<TeamMatch[]> {
 const result=await client().rpc('team_match_list',{target_team:teamId});if(result.error)throw result.error;return result.data as TeamMatch[];
}
export async function loadMatchSummary(id:string):Promise<MatchSummary> {
 const result=await client().rpc('match_summary',{target_match:id});if(result.error)throw result.error;
 const data=result.data as MatchSummary;const urls=await profilePhotoUrls(data.players.flatMap(player=>player.photo_path?[player.photo_path]:[]));
 return {...data,players:data.players.map(player=>({...player,photoUrl:urls.get(player.photo_path??'')}))};
}

const pointLabels:Record<string,string>={participation:'Participación',goals:'Goles',ownGoals:'Goles en propia',assists:'Asistencias',yellowCards:'Amarillas',redCards:'Rojas',cleanSheet:'Portería a cero',result:'Resultado',awayWin:'Victoria visitante (60+ min)'};
export function pointBreakdownLabel(player:MatchPlayer):string{
 if(!player.points_breakdown)return 'Puntuación anterior: se conserva hasta una corrección oficial.';
 return Object.entries(player.points_breakdown.parts).map(([key,value])=>`${pointLabels[key]??key}: ${value>0?'+':''}${value}`).join(' · ');
}
