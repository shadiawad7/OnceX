import rules from '../data/matchCallupRules.json';
import type { FederationGroup } from './federationCatalog';
export function callupCompetitionKey(value:string):string{
 return value.split(' · ')[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/^(lliga|liga)\s+/,'').replace(/\bcadete\b/g,'cadet').replace(/\bpreferente\b/g,'preferent').replace(/\s+/g,' ');
}
/** Unknown seasons/modalities deliberately have no invented regulatory maximum. */
export function matchCallupRule(season:string|null,category:string,group?:FederationGroup|null):{maximum:number;source:string;code:string}|null{
 if(!season)return null;
 const current=group?.seasonCode===season?group:null;
 if(current?.modality&&!['masculi f11','masculino f11','masculino futbol 11'].includes(callupCompetitionKey(current.modality)))return null;
 let key=callupCompetitionKey(current?.competitionName??category);
 if(key==='division de honor juvenil'&&/copa.*campeon/.test(callupCompetitionKey(current?.groupName??'')))key='copa de campeones juvenil';
 const rule=rules.find(rule=>rule.season===season&&rule.competitions.some(name=>callupCompetitionKey(name)===key));
 return rule?{maximum:rule.maximum,source:rule.source,code:rule.code}:null;
}
export function callupLimitError(calledUp:readonly string[],maximum:number|null):string{
 return maximum!==null&&calledUp.length>maximum?`Esta competición permite un máximo de ${maximum} convocados. Quita ${calledUp.length-maximum} para continuar.`:'';
}
