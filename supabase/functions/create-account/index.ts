import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const cors = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async request => {
 try {
 if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
 if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
 const url = Deno.env.get('SUPABASE_URL');
 const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if (!url || !serviceKey) return reply(503, { error: 'El servicio de creación de cuentas no está configurado.' });
 const token = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
 if (!token) return reply(401, { error: 'Inicia sesión para crear cuentas.' });
 const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
 const { data: identity, error: identityError } = await admin.auth.getUser(token);
 if (identityError || !identity.user) return reply(401, { error: 'La sesión ha caducado. Vuelve a iniciar sesión.' });
 let input: Record<string, unknown>;
 try { const body = await request.json(); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid body'); input = body; } catch { return reply(400, { error: 'Formulario no válido.' }); }
 const kind = input.kind;
 const name = typeof input.name === 'string' ? input.name.trim() : '';
 const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
 const password = typeof input.password === 'string' ? input.password : '';
 const category = typeof input.category === 'string' ? input.category.trim() : '';
 const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const clubId = typeof input.clubId === 'string' && uuid.test(input.clubId) ? input.clubId : null;
 const coachId = typeof input.coachId === 'string' && uuid.test(input.coachId) ? input.coachId : null;
 const teamId = typeof input.teamId === 'string' && uuid.test(input.teamId) ? input.teamId : null;
 if (!['club', 'team', 'coach', 'player'].includes(String(kind)) || !name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128
  || (kind === 'player' && !coachId) || (kind !== 'club' && !clubId) || (kind === 'team' && !category) || (['coach', 'player'].includes(String(kind)) && !teamId)) {
  return reply(400, { error: 'Revisa nombre, email y contraseña (entre 8 y 128 caracteres), y el equipo o club seleccionado.' });
 }
 // An authenticated client checks permissions with the operator's token, before Auth writes.
 const caller = createClient(url, serviceKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
 const capability = await caller.rpc('can_create_account', { kind, target_club: clubId, target_team: teamId });
 if (capability.error) return reply(503, { error: 'La creación de cuentas no está configurada en el servidor.' });
 if (capability.data !== true) return reply(403, { error: 'No puedes crear esta cuenta fuera de tu ámbito asignado.' });
 const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
 if (created.error || !created.data.user) {
  const code = created.error?.code;
  return reply(400, { error: code === 'email_exists' || code === 'user_already_exists' ? 'Ese email ya tiene una cuenta. Usa otro email.' : code === 'weak_password' ? 'La contraseña no cumple los requisitos de seguridad.' : 'No se ha podido crear la cuenta. Revisa los datos e inténtalo de nuevo.' });
 }
 const userId = created.data.user.id;
 const assigned = await Promise.resolve(admin.rpc('provision_account', { actor: identity.user.id, new_user: userId, kind, entity_name: name, target_club: clubId, target_team: teamId, team_category: category, assigned_coach: coachId })).catch(() => ({ data: null, error: { code: 'network_error' } }));
 if (assigned.error) {
  const cleanup = await admin.auth.admin.deleteUser(userId);
  // Never include passwords or Auth tokens in logs or responses.
  if (cleanup.error) console.error('Account cleanup failed', { user_id: userId, code: cleanup.error.code });
  return reply(assigned.error.code === '42501' ? 403 : 500, { error: cleanup.error ? 'No se ha completado el alta. Contacta con el administrador antes de reintentar.' : 'No se ha completado el alta. Comprueba los permisos y vuelve a intentarlo.' });
 }
 return reply(201, { result: assigned.data });
 } catch { return reply(503, { error: 'El servicio de altas no está disponible. Comprueba si el alta se ha completado antes de reintentar.' }); }
});
