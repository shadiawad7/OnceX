import { supabase } from './supabase';
import { isMissingPlayerPosition } from './playerDetails';
export type ProvisionKind = 'club' | 'team' | 'coach' | 'player';
export type HierarchyItem = { id: string; name: string; subtitle?: string; role?: string; photoUrl?: string };
export type ProvisionInput = { kind: ProvisionKind; name: string; email: string; password: string; category?: string; clubId?: string; teamId?: string; coachId?: string };
export type ProvisionResult = { club_id: string; team_id: string | null; user_id: string; role: string };
export function client() { if (!supabase) throw new Error('Supabase no está configurado.'); return supabase; }
export async function createHierarchyAccount(input: ProvisionInput): Promise<ProvisionResult> {
 const { data: sessionData, error: sessionError } = await client().auth.getSession();
 if (sessionError || !sessionData.session) throw new Error('Vuelve a iniciar sesión antes de crear la cuenta.');
 const { data, error, response } = await client().functions.invoke('create-account', {
  body: input,
  headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
 });
 if (error) throw new Error(await accountCreationError(error, response));
 if (!data?.result) throw new Error('El servidor no ha confirmado el alta.');
 return data.result;
}
export async function createTeam(input: { name: string; category: string; clubId: string; plan?: string }) {
 const result = await client().from('teams').insert({ name: input.name.trim(), category: input.category, plan_code: input.plan ?? 'basic', club_id: input.clubId }).select('id').single();
 if (result.error) throw new Error('No se ha podido crear el equipo. Comprueba que administras este club y vuelve a intentarlo.');
 return result.data.id as string;
}
export async function creationCapability(kind: ProvisionKind, clubId?: string, teamId?: string) {
 const result = await client().rpc('can_create_account', { kind, target_club: clubId ?? null, target_team: teamId ?? null });
 if (result.error) throw result.error;
 return result.data === true;
}
export async function listClubs(page: number, search: string) {
 const run = (photos:boolean) => {
  let query=client().from('clubs').select(photos?'id,name,photo_path':'id,name',{count:'exact'});
  if(search.trim())query=query.ilike('name',`%${search.trim().replace(/[%_]/g,'')}%`);
  return query.order('name').order('id').range(page*20,page*20+19);
 };
 let result=await run(true);
 if(result.error&&['42703','PGRST204'].includes(result.error.code))result=await run(false);
 if(result.error)throw result.error;
 const records=result.data as unknown as {id:string;name:string;photo_path?:string|null}[];
 const paths=records.flatMap(row=>row.photo_path?[row.photo_path]:[]);
 const urls=new Map<string,string>();
 if(paths.length){
  const signed=await client().storage.from('club-photos').createSignedUrls(paths,3600);
  if(!signed.error)for(const photo of signed.data)if(photo.path&&photo.signedUrl)urls.set(photo.path,`${photo.signedUrl}&v=${Date.now()}`);
 }
 return {items:records.map(row=>({id:row.id,name:row.name,photoUrl:urls.get(row.photo_path??'')})),count:result.count??0};
}
export async function listTeams(clubId: string | undefined, page: number, search: string) {
 let query = client().from('teams').select('id,name,category,clubs(name)', { count: 'exact' });
 if (clubId) query = query.eq('club_id', clubId);
 if (search.trim()) query = query.ilike('name', `%${search.trim().replace(/[%_]/g, '')}%`);
 const result = await query.order('name').order('id').range(page * 20, page * 20 + 19);
 if (result.error) throw result.error;
 return { items: (result.data as unknown as { id: string; name: string; category: string; clubs: { name: string } | null }[]).map(row => ({ id: row.id, name: row.name, subtitle: `${row.clubs?.name ?? ''} · ${row.category}` })), count: result.count ?? 0 };
}
export async function listTeamPeople(teamId: string, roles: string[], page: number, search: string, coachId?: string) {
 const run = (includePosition: boolean) => {
  const profileColumns = includePosition ? 'full_name,position' : 'full_name';
  let query = client().from('team_members').select(`user_id,role_code,profiles!team_members_profile_fk!inner(${profileColumns}),teams(clubs(name))`, { count: 'exact' }).eq('team_id', teamId).in('role_code', roles);
  if (coachId) query = query.eq('coach_id',coachId);
  if (search.trim()) query = query.ilike('profiles.full_name', `%${search.trim().replace(/[%_]/g, '')}%`);
  return query.order('user_id').order('role_code').range(page * 20, page * 20 + 19);
 };
 let result = await run(roles.includes('player'));
 if (isMissingPlayerPosition(result.error)) result = await run(false);
 if (result.error) throw result.error;
 return { items: (result.data as unknown as { user_id: string; role_code: string; profiles: { full_name: string; position?: string }; teams: { clubs: { name: string } | null } }[]).map(row => ({ id: row.user_id, name: row.profiles.full_name || 'Sin nombre', role: row.role_code, subtitle: row.role_code === 'player' ? `${row.teams?.clubs?.name ?? 'Sin club asignado'} · ${row.profiles.position?.trim() || 'Posición sin definir'}` : undefined })), count: result.count ?? 0 };
}

// Native fetch responses may come from another polyfill: don't rely on instanceof.
export async function accountCreationError(error: unknown, response?: unknown): Promise<string> {
 const failure = error as { name?: string; context?: unknown };
 const context = (response ?? failure?.context) as { status?: number; json?: () => Promise<unknown> } | undefined;
 if (context && typeof context.json === 'function') {
  const body = await context.json().catch(() => null) as { error?: unknown; message?: unknown; code?: unknown } | null;
  if (typeof body?.error === 'string') return body.error;
  if (context.status === 401) return 'La sesión no ha sido aceptada. Cierra sesión y vuelve a entrar.';
  if (context.status === 404) return 'El servicio de altas no está desplegado en este proyecto Supabase.';
  if (typeof body?.message === 'string') return `No se ha podido crear la cuenta: ${body.message}`;
  return `El servicio de altas ha devuelto un error${context.status ? ` (${context.status})` : ''}.`;
 }
 if (failure?.name === 'FunctionsFetchError') return 'No se puede conectar con el servicio de altas. Comprueba la conexión del dispositivo y vuelve a intentarlo.';
 if (failure?.name === 'FunctionsRelayError') return 'Supabase no ha podido ejecutar el servicio de altas. Revisa su despliegue.';
 return 'No se ha podido crear la cuenta. Comprueba la conexión y que el servicio de altas esté activado en Supabase.';
}
