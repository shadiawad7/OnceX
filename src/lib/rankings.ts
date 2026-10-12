export type RankingPlayer = { player_id: string; full_name: string; player_position: string; team_id: string; team_name: string; category: string; oncex_score: number | null; photo_path?: string | null; photo_url?: string };
export function rankPlayers(rows: RankingPlayer[], field: 'team_id' | 'player_position' | 'category' | '', value: string): (RankingPlayer & { rank: number | null })[] {
 const players = new Map<string, RankingPlayer>();
 for (const row of rows) if ((!field || !value || row[field] === value) && !players.has(row.player_id)) players.set(row.player_id,row);
 const sorted = [...players.values()].sort((a,b) => (b.oncex_score ?? -1)-(a.oncex_score ?? -1) || a.full_name.localeCompare(b.full_name,'es') || a.player_id.localeCompare(b.player_id));
 return sorted.map((row,index) => ({...row,rank:index+1}));
}
