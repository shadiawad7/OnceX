// Versioned match points. Independent from cumulative totals and Card/OVR ratings.
export const MATCH_SCORING_VERSION='oncex-match-v3';
export const MATCH_POINTS={
 Portero:{goal:8,ownGoal:-5,assist:5,yellow:-4,red:-6,cleanSheet:4},
 Defensa:{goal:6,ownGoal:-4,assist:4,yellow:-3,red:-5,cleanSheet:3},
 Centrocampista:{goal:5,ownGoal:-3,assist:3,yellow:-2,red:-4,cleanSheet:2},
 Delantero:{goal:4,ownGoal:-2,assist:2,yellow:-1,red:-3,cleanSheet:1},
} as const;
export type ScoringPosition=keyof typeof MATCH_POINTS;
export type ScoringInput={venue?:'home'|'away'|null;position:ScoringPosition;duration:number;minutes:number;goals:number;ownGoals:number;assists:number;yellowCards:number;redCards:number;teamGoals:number;opponentGoals:number;concededWhilePlaying:number};
export function participationThreshold(duration:number){return Math.round(duration*2/3);}
export function cleanSheetThreshold(duration:number){return Math.ceil(duration*0.6);}
export function matchPointBreakdown(input:ScoringInput){
 const values=[input.duration,input.minutes,input.goals,input.ownGoals,input.assists,input.yellowCards,input.redCards,input.teamGoals,input.opponentGoals,input.concededWhilePlaying];
 if(values.some(value=>!Number.isInteger(value)||value<0)||input.duration<1||input.minutes>input.duration||input.concededWhilePlaying>input.opponentGoals||input.yellowCards>2||input.redCards>1)throw new Error('Datos de partido no válidos.');
 if(input.minutes===0&&(input.goals>0||input.assists>0||input.ownGoals>0||input.concededWhilePlaying>0))throw new Error('Las acciones de juego requieren minutos.');
 const weights=MATCH_POINTS[input.position];if(!weights)throw new Error('Posición no válida.');
 const cleanSheet=input.minutes>=cleanSheetThreshold(input.duration)&&input.concededWhilePlaying===0;
 const parts={participation:input.minutes>=participationThreshold(input.duration)?2:0,goals:input.goals*weights.goal,ownGoals:input.ownGoals*weights.ownGoal,assists:input.assists*weights.assist,yellowCards:input.yellowCards*weights.yellow,redCards:input.redCards*weights.red,cleanSheet:cleanSheet?weights.cleanSheet:0,awayWin:input.venue==='away'&&input.minutes>=60&&input.teamGoals>input.opponentGoals?1:0,result:input.minutes>0?(input.teamGoals>input.opponentGoals?2:input.teamGoals===input.opponentGoals?1:0):0};
 return {version:MATCH_SCORING_VERSION,cleanSheet,parts,total:Object.values(parts).reduce((sum,value)=>sum+value,0)};
}

// A full-match player concedes the team's final total; a nonparticipant concedes
// none. Only partial appearances need an explicitly confirmed personal count.
export function concededDuringAppearance(minutes:number|null,duration:number,opponentGoals:number|null,recorded:number|null|undefined):number|null{
 if(minutes===null||opponentGoals===null)return null;
 if(minutes===0||opponentGoals===0)return 0;
 if(minutes===duration)return opponentGoals;
 return recorded??null;
}

export type LiveScoringInput=Omit<ScoringInput,'minutes'|'teamGoals'|'opponentGoals'|'concededWhilePlaying'>&{minutes:number|null;teamGoals:number|null;opponentGoals:number|null;concededWhilePlaying:number|null};
// Provisional editor preview: known events count immediately. Missing minutes,
// score or conceded context never produce an assumed result/clean-sheet bonus.
// Official confirmation continues to validate the full input on the server.
export function liveMatchPointBreakdown(input:LiveScoringInput){
 const weights=MATCH_POINTS[input.position];if(!weights)throw new Error('Posición no válida.');
 const minutes=input.minutes??0;
 const resultKnown=input.teamGoals!==null&&input.opponentGoals!==null;
 const cleanSheet=input.minutes!==null&&input.opponentGoals!==null&&input.concededWhilePlaying===0&&minutes>=cleanSheetThreshold(input.duration);
 const parts={participation:minutes>=participationThreshold(input.duration)?2:0,goals:input.goals*weights.goal,ownGoals:input.ownGoals*weights.ownGoal,assists:input.assists*weights.assist,yellowCards:input.yellowCards*weights.yellow,redCards:input.redCards*weights.red,cleanSheet:cleanSheet?weights.cleanSheet:0,awayWin:input.venue==='away'&&minutes>=60&&resultKnown&&input.teamGoals!>input.opponentGoals!?1:0,result:minutes>0&&resultKnown?(input.teamGoals!>input.opponentGoals!?2:input.teamGoals===input.opponentGoals?1:0):0};
 return {version:MATCH_SCORING_VERSION,cleanSheet,parts,total:Object.values(parts).reduce((sum,value)=>sum+value,0)};
}
