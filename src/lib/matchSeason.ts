// ONCEX season convention: July 1 through June 30. Derive from the selected
// calendar date, never from the device's current date or timezone.
export function seasonForMatchDate(value:string):string|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
 const start=month>=7?year:year-1;
 return `${start}/${start+1}`;
}
