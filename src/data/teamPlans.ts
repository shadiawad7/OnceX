export type TeamPlan = 'basic' | 'pro';
export const teamPlans = {
 basic: {label:'BASIC',features:['8 estadísticas oficiales','Perfil individual del jugador','Historial de partidos','Registro manual de estadísticas','Estadísticas acumuladas de temporada','Seguimiento básico del rendimiento','Ranking básico del equipo']},
 pro: {label:'PRO',features:['Todo lo incluido en BASIC','Registro de partidos por voz','Evolución e insights','ONCEX Score avanzado por posición','Ranking global del club','Ranking por posición y categoría','Forma reciente del jugador']}
} as const;
