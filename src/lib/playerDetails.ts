export function isMissingPlayerPosition(error: { code?: string; message?: string } | null): boolean {
 return !!error && (error.code === '42703' || error.code === 'PGRST204') && /\bposition\b/i.test(error.message ?? '');
}

export function birthDateInput(value: string | null): string {
 return value ? value.split('-').reverse().join('/') : '';
}
export function parseBirthDate(value: string, today = new Date()): string | null | undefined {
 if (!value.trim()) return null;
 const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
 if (!match) return undefined;
 const [, day, month, year] = match;
 const date = new Date(Number(year), Number(month)-1, Number(day));
 if (Number(year) < 1900 || date.getFullYear() !== Number(year) || date.getMonth() !== Number(month)-1 || date.getDate() !== Number(day) || date > today) return undefined;
 return `${year}-${month}-${day}`;
}
export function playerAge(birth: string | null, today = new Date()): number | null {
 if (!birth) return null;
 const [year,month,day] = birth.split('-').map(Number);
 return today.getFullYear()-year - (today.getMonth()+1 < month || (today.getMonth()+1 === month && today.getDate() < day) ? 1 : 0);
}
