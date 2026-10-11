import { listPages } from '../lib/listPages';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminClient, adminError, playerSubtitle, adminSections, listAdminRecords, type AdminRow, type AdminSection } from '../lib/admin';
import { colors } from '../theme/colors';
import Button from './Button';
import AdminRecordPicker from './AdminRecordPicker';
import TeamCategoryPicker from './TeamCategoryPicker';
import { Choice, TeamAssignments, UserAssignments } from './AdminAssignments';

type Option = { id: string; label: string };
const entities: Record<string, string> = { profiles: 'Perfil', clubs: 'Club', teams: 'Equipo', user_roles: 'Rol', team_members: 'Miembro de equipo', plans: 'Plan', club_subscriptions: 'Plan de club' };
const actions: Record<string, string> = { INSERT: 'Alta', UPDATE: 'Modificación', DELETE: 'Baja' };

export default function AdminManager({ section }: { section: AdminSection }) {
 const config = adminSections[section];
 const listRef = useRef<FlatList<AdminRow>>(null);
 const [rows, setRows] = useState<AdminRow[]>([]);
 const [count, setCount] = useState(0);
 const [search, setSearch] = useState('');
 const [version, setVersion] = useState(0);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 const [notice, setNotice] = useState('');
 const [editing, setEditing] = useState<AdminRow | null>(null);
 const [creating, setCreating] = useState(false);
 const [name, setName] = useState('');
 const [position, setPosition] = useState('');
 const [category, setCategory] = useState('');
 const [description, setDescription] = useState('');
 const [price, setPrice] = useState('0');
 const [active, setActive] = useState(true);
 const [club, setClub] = useState<Option | null>(null);
 const [plan, setPlan] = useState<Option | null>(null);
 const [busy, setBusy] = useState(false);
 const profiles = config.table === 'profiles';
 const canCreate = section === 'clubs' || section === 'teams' || section === 'plans';
 const formOpen = !!editing || creating;
 useEffect(() => {
  let mounted = true;
  const timer = setTimeout(() => {
   listPages(async page => { const result = await listAdminRecords(section, page, search); return { items: result.rows, count: result.count }; }, () => mounted).then(result => {
    if (mounted) { setRows(result.items); setCount(result.count); setError(''); }
   }).catch(reason => { if (mounted) { setRows([]); setError(adminError(reason)); } })
    .finally(() => { if (mounted) setLoading(false); });
  }, 250);
  return () => { mounted = false; clearTimeout(timer); };
 }, [section, search, version]);
 const refresh = () => { setLoading(true); setVersion(value => value + 1); };
 const begin = (row: AdminRow | null) => {
  listRef.current?.scrollToOffset({ offset: 0, animated: true });
  setEditing(row); setCreating(!row); setNotice('');
  setName(row?.name ?? row?.full_name ?? ''); setCategory(row?.category ?? ''); setPosition(row?.position ?? '');
  setDescription(row?.description ?? ''); setPrice(((row?.monthly_price_cents ?? 0) / 100).toFixed(2));
  setActive(row?.active ?? true);
  setClub(row?.club_id ? { id: row.club_id, label: row.clubs?.name ?? 'Club asignado' } : null);
  setPlan(row?.club_subscriptions ? { id: row.club_subscriptions.plan_id, label: row.club_subscriptions.plans?.name ?? 'Plan asignado' } : null);
 };
 const save = async () => {
  if (!name.trim() || name.trim().length > 120) { setNotice('Introduce un nombre de hasta 120 caracteres.'); return; }
  if (section === 'teams' && !category.trim()) { setNotice('Selecciona la categoría del equipo.'); return; }
  if (section === 'teams' && !club) { setNotice('Selecciona el club del equipo.'); return; }
  const normalized = price.replace(',', '.');
  if (section === 'plans' && (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) * 100 > 2147483647)) { setNotice('Introduce un precio mensual válido con hasta dos decimales.'); return; }
  setBusy(true); setNotice('');
  try {
   const client = adminClient();
   if (section === 'clubs') {
    const result = await client.rpc('admin_save_club', { club_name: name.trim(), target_club: editing?.id ?? null, selected_plan: plan?.id ?? null });
    if (result.error) throw result.error;
   } else {
    const values: Record<string, string | number | boolean> = profiles ? { full_name: name.trim(), ...(section === 'players' && editing?.position !== undefined ? { position: position.trim() } : {}) } : section === 'teams'
     ? { name: name.trim(), category: category.trim(), club_id: club!.id }
     : { name: name.trim(), description: description.trim(), monthly_price_cents: Math.round(Number(normalized) * 100), active };
    const query = editing ? client.from(config.table).update(values).eq('id', editing.id) : client.from(config.table).insert(values);
    const result = await query.select('id').single();
    if (result.error) throw result.error;
   }
   setEditing(null); setCreating(false); setNotice('Cambios guardados.'); refresh();
  } catch (reason) { setNotice(adminError(reason)); listRef.current?.scrollToOffset({ offset: 0, animated: true }); }
  finally { setBusy(false); }
 };
 const remove = (row: AdminRow) => Alert.alert(`Eliminar ${row.name ?? 'registro'}`, section === 'clubs'
  ? 'Se eliminarán sus equipos, asignaciones de roles y pertenencias a equipos. Las cuentas personales se conservarán.'
  : section === 'teams' ? 'Se eliminará el equipo y sus pertenencias.' : 'Solo se puede eliminar un plan que no esté asignado a ningún club.', [
  { text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => {
   setBusy(true); setNotice('');
   try {
    const result = await adminClient().from(config.table).delete().eq('id', row.id).select('id').single();
    if (result.error) throw result.error;
    setEditing(null); setCreating(false); refresh();
   } catch (reason) { setNotice(adminError(reason)); }
   finally { setBusy(false); }
  } },
 ]);
 const refreshRoles = () => {
  refresh();
  if (!editing) return;
  const id = editing.id;
  adminClient().from('profiles').select(adminSections.users.columns).eq('id', id).single().then(result => {
   if (result.error) setNotice(adminError(result.error));
   else setEditing(current => current?.id === id ? result.data as unknown as AdminRow : current);
  });
 };
 const header = <View>
  <Text style={styles.title}>{config.title}</Text>
  {section === 'plans' && <Text style={styles.body}>Catálogo de planes mensuales en EUR. La asignación a clubes se gestiona desde Clubes.</Text>}
  {section === 'activity' && <Text style={styles.body}>Altas, modificaciones y bajas desde la activación del registro de actividad.</Text>}
  {section !== 'activity' && <TextInput accessibilityLabel="Buscar por nombre" placeholder="Buscar por nombre" placeholderTextColor={colors.muted} value={search} style={styles.input} onChangeText={value => { setSearch(value);  setLoading(true); }} />}
  {canCreate && !formOpen && <Button label="CREAR" onPress={() => begin(null)} disabled={busy} />}
  {formOpen && <View style={styles.form}>
   {notice ? <Text accessibilityLiveRegion="polite" style={styles.message}>{notice}</Text> : null}
   <Text style={styles.subtitle}>{creating ? 'Nuevo registro' : 'Editar'}</Text>
   <Text style={styles.body}>Nombre</Text><TextInput accessibilityLabel="Nombre" maxLength={120} value={name} onChangeText={setName} style={styles.input} />
   {section === 'players' && editing?.position !== undefined && <><Text style={styles.body}>Posición</Text><TextInput accessibilityLabel="Posición del jugador" placeholder="Por ejemplo, delantero" placeholderTextColor={colors.muted} maxLength={80} value={position} onChangeText={setPosition} style={styles.input} /></>}
   {section === 'teams' && <><TeamCategoryPicker value={category} onChange={setCategory} disabled={busy} />{editing ? <Text style={styles.body}>Club: {club?.label}</Text> : <AdminRecordPicker title="Club" table="clubs" value={club} onChange={setClub} />}</>}
   {section === 'clubs' && <><AdminRecordPicker title="Plan" table="plans" value={plan} onChange={setPlan} /><Text style={styles.body}>{editing?.club_subscriptions ? `Estado: ${editing.club_subscriptions.status}` : 'Plan opcional. Puedes asignarlo más adelante.'}</Text></>}
   {section === 'plans' && <><Text style={styles.body}>Descripción</Text><TextInput accessibilityLabel="Descripción" value={description} onChangeText={setDescription} multiline style={styles.input} /><Text style={styles.body}>Precio mensual (€)</Text><TextInput accessibilityLabel="Precio mensual en euros" keyboardType="decimal-pad" value={price} onChangeText={setPrice} style={styles.input} /><Choice options={[{ id: 'true', label: 'Activo' }, { id: 'false', label: 'Inactivo' }]} value={String(active)} onChange={value => setActive(value === 'true')} /></>}
   <Button label={busy ? 'GUARDANDO…' : 'GUARDAR'} onPress={save} disabled={busy} />
   <Button label="CERRAR EDICIÓN" secondary disabled={busy} onPress={() => { setEditing(null); setCreating(false); }} />
   {editing && profiles && <UserAssignments key={editing.id} row={editing} refresh={refreshRoles} />}
   {editing && section === 'teams' && <TeamAssignments key={editing.id} row={editing} />}
   {editing && canCreate && <Button label="ELIMINAR" secondary disabled={busy} onPress={() => remove(editing)} />}
  </View>}
  {notice && !formOpen ? <Text accessibilityLiveRegion="polite" style={styles.message}>{notice}</Text> : null}
  {error ? <><Text style={styles.message}>{error}</Text><Button label="REINTENTAR" onPress={refresh} /></> : null}
  {loading && <ActivityIndicator color={colors.red} style={styles.loader} />}
  <Text style={styles.body}>{count} registros</Text>
 </View>;
 return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><FlatList ref={listRef} data={loading ? [] : rows} keyExtractor={item => String(item.id)} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ListHeaderComponent={header} ListEmptyComponent={!loading && !error ? <Text style={styles.body}>No hay registros.</Text> : null} renderItem={({ item }) => section === 'activity'
  ? <View style={styles.card}><Text style={styles.label}>{actions[item.action ?? '']} · {entities[item.entity ?? ''] ?? item.entity}</Text><Text style={styles.body}>{item.profiles?.full_name || 'Sistema'} · {new Date(item.created_at!).toLocaleString('es-ES')}</Text></View>
  : <Pressable accessibilityRole="button" disabled={busy} onPress={() => begin(item)} style={styles.card}><Text style={styles.label}>{item.name ?? item.full_name ?? 'Sin nombre'}</Text><Text style={section === 'players' ? styles.playerMeta : styles.body}>{section === 'players' ? playerSubtitle(item) : section === 'clubs' ? item.club_subscriptions?.plans?.name ?? 'Sin plan asignado' : section === 'teams' ? `${item.clubs?.name} · ${item.category}` : section === 'plans' ? `${((item.monthly_price_cents ?? 0) / 100).toFixed(2)} €/mes · ${item.active ? 'Activo' : 'Inactivo'}` : `${item.user_roles?.length ?? 0} asignaciones de rol`}</Text></Pressable>}
  /></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
 flex: { flex: 1 }, content: { padding: 22, paddingTop: 0, paddingBottom: 40 },
 title: { color: colors.white, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
 body: { color: colors.muted, lineHeight: 21, marginVertical: 8 },
 input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 14, borderRadius: 10, color: colors.white, marginVertical: 6 },
 card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 12 },
 playerMeta: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
 label: { color: colors.white, fontWeight: '700', fontSize: 16 }, form: { marginVertical: 20 },
 message: { color: colors.white, lineHeight: 22, marginVertical: 14 }, loader: { margin: 20 },
 pagination: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 }, link: { color: colors.redBright, paddingVertical: 12 }, disabled: { opacity: 0.3 },
});
