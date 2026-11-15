export type FederationTeam={id:string;name:string;badgeUrl?:string};
export type FederationGroup={source:'ffcv';modality?:string;seasonId:string;seasonCode:string;competitionId:string;competitionName:string;groupId:string;groupName:string;sourceUrl:string;teams:FederationTeam[];ownTeamId:string;importedAt:string};
export type FederationSnapshot=Omit<FederationGroup,'ownTeamId'|'importedAt'>;
export const FFCV_CLASSIFICATIONS_URL='https://ffcv.es/competiciones/?view=clasificaciones#clasificaciones';
const code=(value:unknown)=>typeof value==='string'&&/^\d{1,15}$/.test(value)?value:null;
const label=(value:unknown)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,160):'';
export const normalizeFederationName=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/\s+/g,' ').trim();
export function isFfcvPage(value:string):boolean{
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&['ffcv.es','www.ffcv.es','competiciones.ffcv.es'].includes(url.hostname)&&(url.pathname.startsWith('/competiciones/')||url.hostname==='competiciones.ffcv.es');}catch{return false;}
}
export function federationBadgeUrl(value:unknown):string|undefined{
 if(typeof value!=='string'||value.length>2048)return;
 try{const url=new URL(value);const host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||url.port)return;
  if(host==='ffcv.es'||host.endsWith('.ffcv.es')||host==='novanet.es'||host.endsWith('.novanet.es'))return url.href;
 }catch{/* Invalid or nonpublic image sources are discarded. */}
}
export function parseFederationSnapshot(value:unknown):FederationSnapshot{
 const data=value as Partial<FederationSnapshot>|null;
 if(!data||data.source!=='ffcv'||!code(data.seasonId)||!code(data.competitionId)||!code(data.groupId)||!label(data.competitionName)||!label(data.groupName))throw new Error('Selecciona temporada, competición y grupo en la FFCV.');
 const season=typeof data.seasonCode==='string'?/^(\d{4})[/-](\d{4})$/.exec(data.seasonCode):null;
 if(!season||+season[2]!==+season[1]+1)throw new Error('No se reconoce la temporada seleccionada.');
 if(!Array.isArray(data.teams)||data.teams.length<2||data.teams.length>64)throw new Error('Espera a que se vea la clasificación completa del grupo.');
 const ids=new Set<string>(),names=new Set<string>();
 const teams=data.teams.map(item=>{
  if(!item||!code(item.id)||!label(item.name))throw new Error('La clasificación contiene un equipo sin identificar.');
  const name=label(item.name),normalized=normalizeFederationName(name);
  if(ids.has(item.id)||names.has(normalized))throw new Error('La clasificación contiene equipos duplicados. Vuelve a cargarla.');
  ids.add(item.id);names.add(normalized);return {id:item.id,name,badgeUrl:federationBadgeUrl(item.badgeUrl)};
 });
 // Rebuild a canonical source URL: no arbitrary URL or embedded credentials are stored.
 const url=new URL(FFCV_CLASSIFICATIONS_URL);url.searchParams.set('cod_temporada',data.seasonId!);url.searchParams.set('cod_competicion',data.competitionId!);url.searchParams.set('cod_grupo',data.groupId!);
 return {source:'ffcv',modality:label(data.modality)||undefined,seasonId:data.seasonId!,seasonCode:`${season[1]}/${season[2]}`,competitionId:data.competitionId!,competitionName:label(data.competitionName),groupId:data.groupId!,groupName:label(data.groupName),sourceUrl:url.href,teams};
}
export function confirmFederationGroup(snapshot:unknown,ownTeamId:string,expectedSeason?:string|null):FederationGroup{
 const group=parseFederationSnapshot(snapshot);
 if(expectedSeason&&group.seasonCode!==expectedSeason)throw new Error(`El partido es de ${expectedSeason}. Selecciona esa temporada en la FFCV.`);
 if(!group.teams.some(team=>team.id===ownTeamId))throw new Error('Selecciona tu equipo dentro de este grupo.');
 return {...group,ownTeamId,importedAt:new Date().toISOString()};
}
export function federationOpponents(group:FederationGroup|null|undefined):FederationTeam[]{return group?group.teams.filter(team=>team.id!==group.ownTeamId):[];}
export function opponentBadgeUrl(group:FederationGroup|null|undefined,name:string):string|undefined{
 return federationOpponents(group).find(team=>normalizeFederationName(team.name)===normalizeFederationName(name))?.badgeUrl;
}
/** Executed only after the coach presses Import. Reads the rendered table, never tokens or internal APIs. */
export const FFCV_READ_VISIBLE_GROUP_SCRIPT=`(function(){
 try{
  function selected(id){var el=document.getElementById(id);if(!el)return {id:'',name:''};return {id:el.value,name:(el.options[el.selectedIndex]||{}).text||''};}
  var season=selected('sel-temporada'),modality=selected('sel-cat-grupo'),competition=selected('sel-competicion'),group=selected('sel-grupo'),journey=selected('sel-jornada');
  var container=document.querySelector('[data-clasif-tabs="clasif_'+group.id+'_'+journey.id+'"]');
  if(!container)throw new Error('Selecciona el grupo y espera a que termine de cargar la clasificación.');
  var table=container.querySelector('table');
  if(!table)throw new Error('No se encuentra la clasificación. Selecciona la vista Clasificaciones.');
  var teams=Array.from(table.querySelectorAll('tbody tr')).map(function(row){
   var cell=row.querySelector('.col-equipo'),team=cell&&cell.querySelector('.table-club-name'),image=cell&&cell.querySelector('img');
   if(!team)return null;
   return {id:row.getAttribute('data-codequipo')||team.getAttribute('data-codequipo')||'',name:team.getAttribute('data-team-name')||'',badgeUrl:image?(image.currentSrc||image.src):null};
  }).filter(Boolean);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'oncex.ffcv.group',data:{source:'ffcv',modality:modality.name,seasonId:season.id,seasonCode:season.name.trim(),competitionId:competition.id,competitionName:competition.name,groupId:group.id,groupName:group.name,teams:teams}}));
 }catch(error){window.ReactNativeWebView.postMessage(JSON.stringify({type:'oncex.ffcv.error',message:error.message||'No se ha podido leer el grupo.'}));}
})();true;`;
