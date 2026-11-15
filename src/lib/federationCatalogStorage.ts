import { client } from './client';
import { confirmFederationGroup, parseFederationSnapshot, type FederationGroup } from './federationCatalog';
export function federationConfigurationError(reason:unknown):Error{
 const error=reason as {code?:string;message?:string};
 if(['42703','PGRST204','PGRST202','42883'].includes(error?.code??''))return new Error('Falta activar la configuración federativa de equipos en Supabase (202611140001_team_federation_groups.sql).');
 return new Error(error?.message||'No se ha podido guardar la competición del equipo.');
}
export function parseSavedFederationGroups(value:unknown):FederationGroup[]{
 if(!Array.isArray(value))return [];
 return value.slice(0,12).flatMap(item=>{try{
  const snapshot=parseFederationSnapshot(item);
  if(typeof item.ownTeamId!=='string'||!snapshot.teams.some(team=>team.id===item.ownTeamId)||typeof item.importedAt!=='string')return [];
  return [{...snapshot,ownTeamId:item.ownTeamId,importedAt:item.importedAt}];
 }catch{return [];}});
}
export async function readFederationGroups(teamId:string):Promise<FederationGroup[]>{
 const result=await client().from('teams').select('federation_groups').eq('id',teamId).single();
 if(result.error)throw federationConfigurationError(result.error);
 return parseSavedFederationGroups(result.data?.federation_groups);
}
export async function saveFederationGroup(teamId:string,group:FederationGroup):Promise<void>{
 const checked=confirmFederationGroup(group,group.ownTeamId);
 const result=await client().rpc('save_team_federation_group',{target_team:teamId,selected_group:checked});
 if(result.error)throw federationConfigurationError(result.error);
}
