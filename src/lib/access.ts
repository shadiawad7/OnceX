import { supabase } from './supabase';

export const roleLabels = {
  super_admin: 'SUPER ADMIN',
  club_admin: 'CLUB ADMIN',
  team_admin: 'ADMIN EQUIPO',
  coach: 'ENTRENADOR',
  player: 'JUGADOR',
} as const;
export type RoleCode = keyof typeof roleLabels;
export type Membership = { role_code: RoleCode; club_id: string | null };
export type AccountAccess = { userId: string; fullName: string; memberships: Membership[]; primaryRole: RoleCode };
export class SessionRequired extends Error {}

export async function loadAccountAccess(): Promise<AccountAccess> {
  if (!supabase) throw new Error('Configura Supabase para acceder a tu cuenta.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error('No se ha podido comprobar la sesión. Vuelve a iniciar sesión.');
  if (!auth.user) throw new SessionRequired();
  const [profile, roles] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', auth.user.id).single(),
    supabase.from('user_roles').select('role_code, club_id').eq('user_id', auth.user.id),
  ]);
  if (profile.error || roles.error) {
    throw new Error('No se ha podido cargar tu perfil. Comprueba la conexión y que la migración de usuarios y roles esté aplicada en Supabase.');
  }
  const memberships: Membership[] = (roles.data ?? []).flatMap(row =>
    Object.hasOwn(roleLabels, row.role_code)
      ? [{ role_code: row.role_code as RoleCode, club_id: row.club_id as string | null }]
      : []);
  const primaryRole = (Object.keys(roleLabels) as RoleCode[]).find(code => memberships.some(item => item.role_code === code));
  if (!primaryRole) throw new Error('Tu cuenta no tiene un rol asignado. Contacta con el administrador.');
  return { userId: auth.user.id, fullName: profile.data.full_name, memberships, primaryRole };
}
