export function toggleCallup(calledUp:string[],starters:string[],id:string,maximum:number|null=null){
 if(!calledUp.includes(id)&&maximum!==null&&calledUp.length>=maximum)throw new Error(`Esta competición permite un máximo de ${maximum} convocados.`);
 return calledUp.includes(id)
  ?{calledUp:calledUp.filter(value=>value!==id),starters:starters.filter(value=>value!==id)}
  :{calledUp:[...calledUp,id],starters};
}
export function toggleLineupStarter(calledUp:string[],starters:string[],id:string):string[]{
 if(!calledUp.includes(id))throw new Error('Elige primero al jugador en convocados.');
 if(starters.includes(id))return starters.filter(value=>value!==id);
 if(starters.length>=11)throw new Error('Ya hay 11 titulares. Quita uno antes de elegir otro.');
 return [...starters,id];
}
export function lineupSubstitutes(calledUp:string[],starters:string[]):string[]{
 return calledUp.filter(id=>!starters.includes(id));
}
