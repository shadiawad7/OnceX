import { client } from './client';
export type OvrSnapshot={month:string;overall:number;model_version:string};
export type OvrEvolution={season:string|null;status:'pending_model'|'insufficient_sample'|'ready';baseline:{overall:number;assessed_at:string}|null;current:{overall:number;assessed_at:string;model_version:string;attributes:Record<string,number>;position:string;reliability?:number;comparable_count?:number}|null;snapshots:OvrSnapshot[]};
export async function loadPlayerEvolution(playerId:string):Promise<OvrEvolution>{
 const result=await client().rpc('player_ovr_evolution',{target_player:playerId});
 if(result.error)throw result.error;
 return result.data as OvrEvolution;
}
export function monthlyOvrPoints(snapshots:OvrSnapshot[]):OvrSnapshot[]{
 return snapshots.filter(snapshot=>Number.isInteger(snapshot.overall)&&snapshot.overall>=0&&snapshot.overall<=99&&/^\d{4}-\d{2}-01$/.test(snapshot.month)).sort((a,b)=>a.month.localeCompare(b.month));
}
export function ovrChange(current:number|null,first:number|null):number|null{return current===null||first===null?null:current-first;}
