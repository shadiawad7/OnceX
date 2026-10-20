import { supabase } from './supabase';
import { isMissingPlayerPosition } from './playerDetails';

export const adminSections = {
 clubs: { title: 'Clubes', table: 'clubs', columns: 'id,name,club_subscriptions(plan_id,status,plans(name))', order: 'name' },
 teams: { title: 'Equipos', table: 'teams', columns: 'id,name,category,club_id,clubs(name)', order: 'name' },
 players: { title: 'Jugadores', table: 'profiles', columns: 'id,full_name,position,user_roles!inner(id,role_code,club_id,clubs(name))', order: 'full_name' },
 coaches: { title: 'Entrenadores', table: 'profiles', columns: 'id,full_name,user_roles!inner(id,role_code,club_id,clubs(name))', order: 'full_name' },
 users: { title: 'Usuarios', table: 'profiles', columns: 'id,full_name,user_roles(id,role_code,club_id,clubs(name))', order: 'full_name' },
 plans: { title: 'Planes', table: 'plans', columns: 'id,name,description,monthly_price_cents,active', order: 'name' },
 activity: { title: 'Actividad general', table: 'activity_log', columns: 'id,entity,action,created_at,profiles(full_name)', order: 'id' },
} as const;
export type AdminSection = keyof typeof adminSections;
export type AdminRow = {
 id: string; name?: string; full_name?: string; position?: string; category?: string; club_id?: string;
 description?: string; monthly_price_cents?: number; active?: boolean;
 entity?: string; action?: string; created_at?: string; profiles?: { full_name: string } | null;
 clubs?: { name: string } | null;
 user_roles?: { id: string; role_code: string; club_id: string | null; clubs: { name: string } | null }[];
 club_subscriptions?: { plan_id: string; status: string; plans: { name: string } | null } | null;
};
export function adminClient() {
 if (!supabase) throw new Error('Supabase no está configurado.');
 return supabase;
}
export async function listAdminRecords(section: AdminSection, page: number, search: string) {
 const config = adminSections[section];
 const run = (columns: string) => {
  let query = adminClient().from(config.table).select(columns, { count: 'exact' });
  if (section === 'players' || section === 'coaches') query = query.eq('user_roles.role_code', section === 'players' ? 'player' : 'coach');
  if (search.trim() && section !== 'activity') {
   const column = config.table === 'profiles' ? 'full_name' : 'name';
   query = query.ilike(column, `%${search.trim().replace(/[%_]/g, '')}%`);
  }
  return query.order(config.order, { ascending: section !== 'activity' }).range(page * 20, page * 20 + 19);
 };
 let result = await run(config.columns);
 if (section === 'players' && isMissingPlayerPosition(result.error)) result = await run(config.columns.replace(',position',''));
 if (result.error) throw result.error;
 return { rows: result.data as unknown as AdminRow[], count: result.count ?? 0 };
}
export function adminError(error: unknown): string {
 const code = typeof error === 'object' && error && 'code' in error ? error.code : null;
 if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883') return 'La configuración del panel está incompleta. Completa la configuración de Super Admin en Supabase.';
 if (code === 'PGRST301' || code === 'PGRST303') return 'La sesión ha caducado. Vuelve a iniciar sesión.';
 if (code === '42501') return 'No tienes permiso para realizar esta operación.';
 if (code === '23505') return 'Esa asignación ya existe.';
 if (code === '23503') return 'Hay datos vinculados. Revisa las asignaciones antes de continuar.';
 if (code === '23514' || code === '22P02') return 'Revisa los datos del formulario.';
 return 'No se ha podido completar la operación. Comprueba la conexión y que las migraciones estén aplicadas.';
}

export function playerSubtitle(row: AdminRow): string {
 const clubs = [...new Set(row.user_roles?.filter(role => role.role_code === 'player').map(role => role.clubs?.name).filter(Boolean))];
 return `${clubs.join(', ') || 'Sin club asignado'} · ${row.position?.trim() || 'Posición sin definir'}`;
}
