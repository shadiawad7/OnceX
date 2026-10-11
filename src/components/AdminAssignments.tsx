import { listPages } from '../lib/listPages';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import AdminRecordPicker from './AdminRecordPicker';
import Button from './Button';
import { adminClient, adminError, type AdminRow } from '../lib/admin';
import { roleLabels, type RoleCode } from '../lib/access';
import { colors } from '../theme/colors';

type Option = { id: string; label: string };
export function Choice({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (value: string) => void }) {
 return <View style={styles.choices}>{options.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: value === option.id }} onPress={() => onChange(option.id)} style={[styles.choice, value === option.id && styles.selected]}><Text style={styles.text}>{option.label}</Text></Pressable>)}</View>;
}
export function UserAssignments({ row, refresh }: { row: AdminRow; refresh: () => void }) {
 const [role, setRole] = useState<RoleCode>('player');
 const [club, setClub] = useState<Option | null>(null);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const grant = async () => {
  if ((role === 'club_admin' || role === 'coach') && !club) { setMessage('Selecciona un club para este rol.'); return; }
  setBusy(true); setMessage('');
  try {
   const result = await adminClient().from('user_roles').insert({ user_id: row.id, role_code: role, club_id: role === 'super_admin' ? null : club?.id ?? null }).select('id').single();
   if (result.error) throw result.error;
   refresh(); setMessage('Rol asignado.');
  } catch (error) { setMessage(adminError(error)); }
  finally { setBusy(false); }
 };
 const revoke = (id: string) => Alert.alert('Retirar rol', 'También se retirarán las pertenencias a equipos vinculadas a ese rol. ¿Continuar?', [
  { text: 'Cancelar', style: 'cancel' }, { text: 'Retirar', style: 'destructive', onPress: async () => {
   setBusy(true);
   try {
    const result = await adminClient().from('user_roles').delete().eq('id', id).select('id').single();
    if (result.error) throw result.error;
    refresh(); setMessage('Rol retirado.');
   } catch (error) { setMessage(adminError(error)); }
   finally { setBusy(false); }
  } },
 ]);
 return <View style={styles.panel}><Text style={styles.title}>Roles de la cuenta</Text>
  {row.user_roles?.map(item => <View key={item.id} style={styles.assignment}><Text style={styles.text}>{roleLabels[item.role_code as RoleCode]} · {item.clubs?.name ?? 'Global'}</Text>{item.role_code !== 'super_admin' && <Pressable disabled={busy} accessibilityRole="button" onPress={() => revoke(item.id)}><Text style={styles.link}>Retirar</Text></Pressable>}</View>)}
  <Choice options={Object.entries(roleLabels).filter(([id]) => id !== 'team_admin').map(([id, label]) => ({ id, label }))} value={role} onChange={value => { setRole(value as RoleCode); setClub(null); }} />
  {role !== 'super_admin' && <><AdminRecordPicker title="Club" table="clubs" value={club} onChange={setClub} />{role === 'player' && <Pressable onPress={() => setClub(null)}><Text style={styles.link}>Sin club (cuenta personal)</Text></Pressable>}</>}
  {message ? <Text style={styles.text} accessibilityLiveRegion="polite">{message}</Text> : null}
  <Button label={busy ? 'GUARDANDO…' : 'ASIGNAR ROL'} disabled={busy} onPress={grant} />
 </View>;
}
type TeamMember = { user_id: string; role_code: string; profiles: { full_name: string } | null };
export function TeamAssignments({ row }: { row: AdminRow }) {
 const [role, setRole] = useState('player');
 const [user, setUser] = useState<Option | null>(null);
 const [members, setMembers] = useState<TeamMember[]>([]);
 const [version, setVersion] = useState(0);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 useEffect(() => {
  let active = true;
  listPages(async page => {
   const result = await adminClient().from('team_members').select('user_id,role_code,profiles!team_members_profile_fk(full_name)', { count: 'exact' }).eq('team_id', row.id).order('user_id').order('role_code').range(page * 20, page * 20 + 19);
   if (result.error) throw result.error;
   return { items: result.data as unknown as TeamMember[], count: result.count ?? 0 };
  }, () => active).then(result => { if(active) { setMembers(result.items); setMessage(''); } }).catch(reason => { if(active) setMessage(adminError(reason)); });
  return () => { active = false; };
 }, [row.id, version]);
 const mutate = async (member?: TeamMember) => {
  if (!member && !user) { setMessage('Selecciona una cuenta del club.'); return; }
  setBusy(true); setMessage('');
  try {
   const client = adminClient();
   const result = member
    ? await client.from('team_members').delete().eq('team_id', row.id).eq('user_id', member.user_id).eq('role_code', member.role_code).select('user_id').single()
    : await client.from('team_members').insert({ team_id: row.id, club_id: row.club_id, user_id: user!.id, role_code: role }).select('user_id').single();
   if (result.error) throw result.error;
   setVersion(value => value + 1); setUser(null);
  } catch (error) { setMessage(adminError(error)); }
  finally { setBusy(false); }
 };
 return <View style={styles.panel}><Text style={styles.title}>Plantilla del equipo</Text>
  {members.map(member => <View style={styles.assignment} key={`${member.user_id}-${member.role_code}`}><Text style={styles.text}>{member.profiles?.full_name || 'Sin nombre'} · {roleLabels[member.role_code as RoleCode]}</Text><Pressable disabled={busy} onPress={() => Alert.alert('Retirar del equipo', 'La cuenta seguirá perteneciendo al club.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Retirar', style: 'destructive', onPress: () => { void mutate(member); } }])}><Text style={styles.link}>Retirar</Text></Pressable></View>)}
  <Choice options={[{ id: 'player', label: 'Jugador' }, { id: 'coach', label: 'Entrenador' }]} value={role} onChange={value => { setRole(value); setUser(null); }} />
  <AdminRecordPicker title="Cuenta del club" table="profiles" value={user} onChange={setUser} clubId={row.club_id} roleCode={role} />
  <Text style={styles.hint}>La cuenta debe tener primero este rol en el club, desde Usuarios y roles.</Text>
  {message ? <Text style={styles.text}>{message}</Text> : null}
  <Button label="AÑADIR AL EQUIPO" onPress={() => { void mutate(); }} disabled={busy} />
 </View>;
}
const styles = StyleSheet.create({
 panel: { borderTopWidth: 1, borderColor: colors.border, marginTop: 24, paddingTop: 20, gap: 12 },
 title: { color: colors.white, fontWeight: '800', fontSize: 18 },
 text: { color: colors.white, flexShrink: 1, lineHeight: 22 },
 hint: { color: colors.muted, lineHeight: 20 },
 link: { color: colors.redBright, paddingVertical: 8 },
 assignment: { gap: 8 },
 choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
 choice: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
 selected: { borderColor: colors.red, backgroundColor: colors.surfaceElevated },
});
