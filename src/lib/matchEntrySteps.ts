export function matchEntryStepError(venue:'home'|'away'|null,teamGoals:string,opponentGoals:string,step:'details'|'result'|'statistics'):string{
 if(!venue)return 'Completa primero el paso 1: selecciona si el club juega como LOCAL o VISITANTE.';
 if(step==='statistics'&&(!/^\d+$/.test(teamGoals)||!/^\d+$/.test(opponentGoals)||Number(teamGoals)>99||Number(opponentGoals)>99))return 'Completa primero el paso 2: introduce el resultado final de los dos equipos. Si no marcaron goles, escribe 0.';
 return '';
}
