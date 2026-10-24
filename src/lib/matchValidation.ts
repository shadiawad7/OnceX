type PlayerStatistics={player_name:string;minutes:number|null;goals:number;own_goals:number;assists:number;yellow_cards:number;red_cards:number};
export function matchStatisticsError(players:PlayerStatistics[],teamGoals:number,opponentGoals:number,duration:number):string{
 if(!Number.isInteger(teamGoals)||!Number.isInteger(opponentGoals)||teamGoals<0||opponentGoals<0||teamGoals>99||opponentGoals>99)return 'Introduce un resultado válido entre 0 y 99.';
 for(const player of players){
  if([player.goals,player.own_goals,player.assists,player.yellow_cards,player.red_cards].some(value=>!Number.isInteger(value)||value<0))return `Revisa las estadísticas de ${player.player_name}: deben ser números enteros positivos o 0.`;
  if(player.minutes===null||!Number.isInteger(player.minutes)||player.minutes<0||player.minutes>duration)return `Registra los minutos de ${player.player_name} entre 0 y ${duration}.`;
  if(player.minutes===0&&(player.goals>0||player.assists>0||player.own_goals>0))return `${player.player_name} tiene acciones de juego, pero figura con 0 minutos.`;
  if(player.yellow_cards>2||player.red_cards>1)return `Revisa las tarjetas de ${player.player_name}: máximo 2 amarillas y 1 roja.`;
 }
 const goals=players.reduce((sum,p)=>sum+p.goals,0),assists=players.reduce((sum,p)=>sum+p.assists,0),ownGoals=players.reduce((sum,p)=>sum+p.own_goals,0);
 if(goals!==teamGoals)return `El marcador indica ${teamGoals} goles del club, pero has registrado ${goals} entre los jugadores. Deben coincidir exactamente.`;
 if(assists>teamGoals)return `Has registrado ${assists} asistencias, pero el club marcó ${teamGoals} goles. No puede haber más asistencias que goles.`;
 for(const player of players)if(player.assists>teamGoals-player.goals)return `${player.player_name} tiene más asistencias que goles marcados por sus compañeros. Un jugador no puede asistirse a sí mismo.`;
 if(ownGoals>opponentGoals)return `Los ${ownGoals} goles en propia registrados no pueden superar los ${opponentGoals} goles del rival.`;
 if(players.reduce((sum,p)=>sum+(p.minutes??0),0)>11*duration)return `La suma de minutos supera los ${11*duration} disponibles para 11 jugadores.`;
 return '';
}
