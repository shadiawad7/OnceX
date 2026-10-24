// Versioned relative ratings. Official point rates inform IMP/EFI;
// accumulated points are never used directly as the Overall.
export type OutfieldAttribute = 'FIN' | 'CRE' | 'IMP' | 'DIS' | 'REG' | 'EFI';
export type GoalkeeperAttribute = 'POR' | 'SEG' | 'IMP' | 'DIS' | 'REG' | 'EFI';
export type CardAttribute = { code: OutfieldAttribute | GoalkeeperAttribute; label: string; value: number | null };
export type OncexCardAssessment = {
 source: 'pending' | 'calculated';
 modelVersion: string;
 variant: 'outfield' | 'goalkeeper';
 overall: number | null;
 reliability?: number;
 comparableCount?: number;
 attributes: readonly CardAttribute[];
};
export function cardPosition(position: string): string {
 const normalized=position.trim().toLowerCase();
 if(['portero','portera','por'].includes(normalized))return 'POR';
 if(['defensa','def'].includes(normalized))return 'DEF';
 if(['centrocampista','medio','med'].includes(normalized))return 'MED';
 if(['delantero','delantera','del'].includes(normalized))return 'DEL';
 return '—';
}
