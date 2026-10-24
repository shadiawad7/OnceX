import { cardPosition, type OncexCardAssessment } from '../lib/oncexCard';

// Attribute definitions and an unassessed state. No invented ratings or formula.
const outfieldPending: OncexCardAssessment = {
 source:'pending',modelVersion:'not-calculated',variant:'outfield',overall:null,
 attributes:[
  {code:'FIN',label:'Finalización',value:null},
  {code:'CRE',label:'Creación',value:null},
  {code:'IMP',label:'Impacto',value:null},
  {code:'DIS',label:'Disciplina',value:null},
  {code:'REG',label:'Regularidad',value:null},
  {code:'EFI',label:'Eficacia',value:null},
 ],
};
const goalkeeperPending: OncexCardAssessment = {
 source:'pending',modelVersion:'not-calculated',variant:'goalkeeper',overall:null,
 attributes:[
  {code:'POR',label:'Portería',value:null},
  {code:'SEG',label:'Seguridad',value:null},
  {code:'IMP',label:'Impacto',value:null},
  {code:'DIS',label:'Disciplina',value:null},
  {code:'REG',label:'Regularidad',value:null},
  {code:'EFI',label:'Eficacia',value:null},
 ],
};
export function pendingCardAssessment(position:string):OncexCardAssessment {
 return cardPosition(position)==='POR'?goalkeeperPending:outfieldPending;
}
