import { teamCategories } from '../data/teamCategories';
import type { FederationGroup } from './federationCatalog';
function competitionKey(value:string):string{
 return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').replace(/^\s*(lliga|liga)\s+/,'').replace(/\bcadete\b/g,'cadet').replace(/\s+/g,' ').trim();
}
/** Keep the existing canonical category value when the federation names the same league. */
export function teamCategoryFromFederation(group:Pick<FederationGroup,'competitionName'>|null):string{
 if(!group)return '';
 const name=group.competitionName.trim();
 if(!name)return '';
 return teamCategories.find(category=>competitionKey(category.label)===competitionKey(name))?.value??`${name} · Comunidad Valenciana`;
}
