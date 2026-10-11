import { listPages } from '../lib/listPages';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminClient, adminError } from '../lib/admin';
import { colors } from '../theme/colors';

type Option = { id: string; label: string };
export default function AdminRecordPicker({ title, table, value, onChange, clubId, roleCode }: {
 title: string; table: 'clubs' | 'plans' | 'profiles'; value: Option | null;
 onChange: (value: Option) => void; clubId?: string; roleCode?: string;
}) {
 const [open, setOpen] = useState(false);
 return <><Pressable accessibilityRole="button" style={styles.control} onPress={() => setOpen(true)}><Text style={styles.text}>{title}: {value?.label ?? 'Seleccionar'} ▾</Text></Pressable>
  <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
   {open && <Options title={title} table={table} clubId={clubId} roleCode={roleCode} onClose={() => setOpen(false)} onSelect={option => { onChange(option); setOpen(false); }} />}
  </Modal></>;
}
function Options({ title, table, clubId, roleCode, onClose, onSelect }: {
 title: string; table: 'clubs' | 'plans' | 'profiles'; clubId?: string; roleCode?: string;
 onClose: () => void; onSelect: (option: Option) => void;
}) {
 const [search, setSearch] = useState('');
 const [rows, setRows] = useState<Option[]>([]);
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
  let active = true;
  const timer = setTimeout(async () => {
   try {
    const column = table === 'profiles' ? 'full_name' : 'name';
    let query = adminClient().from(table).select(`id,${column}${clubId ? ',user_roles!inner(role_code,club_id)' : ''}`, { count: 'exact' });
    if (clubId) query = query.eq('user_roles.club_id', clubId).eq('user_roles.role_code', roleCode);
    if (search.trim()) query = query.ilike(column, `%${search.trim().replace(/[%_]/g, '')}%`);
    const result = await listPages(async page => {
     const response = await query.order(column).order('id').range(page * 20, page * 20 + 19);
     if (response.error) throw response.error;
     return { items: (response.data as unknown as Record<string,string>[]).map(row => ({ id: row.id, label: row[column] || 'Sin nombre' })), count: response.count ?? 0 };
    }, () => active);
    if (active) {
     setRows(result.items); setError(null);
    }
   } catch (reason) { if (active) setError(adminError(reason)); }
   finally { if (active) setLoading(false); }
  }, 250);
  return () => { active = false; clearTimeout(timer); };
 }, [table, search, clubId, roleCode]);
 return <SafeAreaView style={styles.safe}><View style={styles.top}><Text style={styles.text}>{title}</Text><Pressable accessibilityRole="button" onPress={onClose}><Text style={styles.text}>Cerrar</Text></Pressable></View>
  <TextInput accessibilityLabel="Buscar" placeholder="Buscar por nombre" placeholderTextColor={colors.muted} value={search} onChangeText={text => { setLoading(true); setSearch(text); }} style={styles.control} />
  {loading ? <ActivityIndicator color={colors.red} /> : error ? <Text style={styles.text}>{error}</Text> : <FlatList data={rows} keyExtractor={item => item.id} renderItem={({ item }) => <Pressable style={styles.control} accessibilityRole="button" onPress={() => onSelect(item)}><Text style={styles.text}>{item.label}</Text></Pressable>} ListEmptyComponent={<Text style={styles.text}>No hay resultados.</Text>} />}
 </SafeAreaView>;
}
const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: colors.background, padding: 20 },
 top: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20 },
 control: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 16, borderRadius: 10, marginVertical: 6, color: colors.white },
 text: { color: colors.white, lineHeight: 22 },
});
