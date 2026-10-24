import { useEffect, useState } from 'react';
import { client } from '../lib/client';
export async function checkTeamJersey(teamId:string,jersey:string,excludedPlayer?:string):Promise<boolean>{
 const result=await client().rpc('team_jersey_available',{target_team:teamId,jersey:Number(jersey),excluded_player:excludedPlayer??null});
 if(result.error)throw new Error(['PGRST202','42883'].includes(result.error.code)?'Activa la migración de dorsales únicos en Supabase para comprobar el número.':'No se ha podido comprobar el dorsal. Inténtalo de nuevo.');
 return result.data===true;
}
async function occupiedNumbers(teamId:string,excludedPlayer?:string):Promise<number[]>{
 const result=await client().rpc('team_jersey_numbers',{target_team:teamId,excluded_player:excludedPlayer??null});
 if(!result.error)return result.data as number[];
 // Compatible with the previous migration: known conflicts still appear instantly.
 if(!['PGRST202','42883'].includes(result.error.code))return [];
 const roster=await client().from('team_members').select('user_id,profiles!team_members_profile_fk(jersey_number)').eq('team_id',teamId).eq('role_code','player');
 return (roster.data as unknown as {user_id:string;profiles:{jersey_number:number|null}|null}[]??[]).filter(row=>row.user_id!==excludedPlayer).flatMap(row=>row.profiles?.jersey_number==null?[]:[row.profiles.jersey_number]);
}
export function useTeamJerseyAvailability(team:string|string[]|undefined,jersey:string,excludedPlayer?:string){
 const teams=Array.isArray(team)?team:team?[team]:[];
 const teamKey=[...new Set(teams)].sort().join(',');
 const rosterKey=`${teamKey}:${excludedPlayer??''}`;
 const valid=!!teamKey&&/^\d{1,2}$/.test(jersey)&&Number(jersey)>=1&&Number(jersey)<=99;
 const key=`${rosterKey}:${jersey}`;
 const [occupied,setOccupied]=useState<{key:string;numbers:number[]}|null>(null);
 const [result,setResult]=useState<{key:string;available:boolean;error:string}|null>(null);
 useEffect(()=>{if(!teamKey)return;let active=true;void Promise.all(teamKey.split(',').map(id=>occupiedNumbers(id,excludedPlayer))).then(values=>{if(active)setOccupied({key:rosterKey,numbers:values.flat()});}).catch(()=>{});return()=>{active=false;};},[teamKey,excludedPlayer,rosterKey]);
 useEffect(()=>{if(!valid)return;let active=true;void Promise.all(teamKey.split(',').map(id=>checkTeamJersey(id,jersey,excludedPlayer))).then(values=>{if(active)setResult({key,available:values.every(Boolean),error:''});}).catch(reason=>{if(active)setResult({key,available:false,error:(reason as Error).message});});return()=>{active=false;};},[valid,teamKey,jersey,excludedPlayer,key]);
 const current=result?.key===key?result:null;
 const taken=occupied?.key===rosterKey&&occupied.numbers.includes(Number(jersey));
 return {checking:valid&&!taken&&!current,available:valid&&!taken&&current?.available===true,message:!jersey?'':!teamKey?'Comprobando el equipo del jugador…':!valid?'El dorsal debe estar entre 1 y 99.':taken||current&&!current.error&&!current.available?`El dorsal ${Number(jersey)} ya está ocupado en este equipo. Elige otro.`:!current?'Comprobando dorsal…':current.error};
}
