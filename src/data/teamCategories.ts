// Competition labels are kept separately from the form so territorial catalogues
// can be extended without changing the screen. See docs/team-categories.md.
export const categoryGroups = [
 { id: 'cadete', label: 'Cadete' },
 { id: 'juvenil', label: 'Juvenil' },
 { id: 'amateur', label: 'Amateur / Sénior' },
] as const;
export type CategoryGroup = typeof categoryGroups[number]['id'];
export type TeamCategory = { group: CategoryGroup; label: string; territory: string; value: string };
const entries: [CategoryGroup, string[]][] = [
 ['cadete', ['Lliga Autonòmica Cadet', 'Lliga Preferent Cadet', 'Primera Cadet', 'Segona Cadet']],
 ['juvenil', ['División de Honor Juvenil', 'Liga Nacional Juvenil', 'Lliga Comunitat Juvenil', 'Lliga Primera FFCV Juvenil', 'Lliga Segona FFCV Juvenil', 'Lliga Tercera FFCV Juvenil']],
 ['amateur', ['Lliga Comunitat FFCV', 'Lliga Primera FFCV', 'Lliga Segona FFCV', 'Lliga Tercera FFCV']],
];
export const teamCategories: TeamCategory[] = entries.flatMap(([group, labels]) => labels.map(label => ({
 group, territory: 'Comunidad Valenciana', label,
 value: `${label} · Comunidad Valenciana`,
})));
export function categoryGroupFor(value: string): CategoryGroup {
 const existing = teamCategories.find(category => category.value === value);
 if (existing) return existing.group;
 const normalized = value.toLowerCase();
 return normalized.includes('cadet') ? 'cadete' : normalized.includes('juven') ? 'juvenil' : 'amateur';
}
