import { useEffect, useState } from 'react';
import { readFederationGroups } from '../lib/federationCatalogStorage';
import { type FederationGroup } from '../lib/federationCatalog';
export function useFederationCatalog(teamId:string,season?:string|null){
 const [stored,setStored]=useState<{teamId:string;groups:FederationGroup[]}|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;void readFederationGroups(teamId).then(groups=>{if(active){setStored({teamId,groups});setError('');}}).catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'No se ha podido cargar la competición del equipo.');});return()=>{active=false;};},[teamId]);
 const groups=stored?.teamId===teamId?stored.groups:[];
 const catalog=season?groups.find(group=>group.seasonCode===season)??null:groups[0]??null;
 return {catalog,error};
}
