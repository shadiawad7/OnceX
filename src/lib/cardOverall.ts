import type { OutfieldAttribute } from './oncexCard';
// Shared display/test weights; official Card attributes and OVR are calculated by the server.
export const OVR_WEIGHTS={
 DEL:{FIN:.25,CRE:.15,IMP:.25,DIS:.10,REG:.10,EFI:.15},
 MED:{FIN:.15,CRE:.25,IMP:.20,DIS:.10,REG:.15,EFI:.15},
 DEF:{FIN:.10,CRE:.10,IMP:.30,DIS:.15,REG:.20,EFI:.15},
} as const;
export function weightedOutfieldOverall(position:keyof typeof OVR_WEIGHTS,attributes:Record<OutfieldAttribute,number>):number{
 const weights=OVR_WEIGHTS[position];
 const value=(Object.keys(weights) as OutfieldAttribute[]).reduce((sum,key)=>{
  const rating=attributes[key];if(!Number.isFinite(rating)||rating<0||rating>99)throw new Error('Cada atributo debe estar entre 0 y 99.');return sum+rating*weights[key];
 },0);
 return Math.round(value);
}
