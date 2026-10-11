import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryGroups, categoryGroupFor, teamCategories, type CategoryGroup } from '../data/teamCategories';
import { colors } from '../theme/colors';
import { Choice } from './AdminAssignments';

export default function TeamCategoryPicker({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
 const [open, setOpen] = useState(false);
 const [group, setGroup] = useState<CategoryGroup>('cadete');
 const [search, setSearch] = useState('');
 const filtered = teamCategories.filter(item => item.group === group && normalize(`${item.label} ${item.territory}`).includes(normalize(search)));
 return <><Text style={styles.label}>Categoría</Text><Pressable accessibilityRole="button" accessibilityLabel={`Elegir categoría. ${value || 'Sin seleccionar'}`} disabled={disabled} onPress={() => { setGroup(value ? categoryGroupFor(value) : 'cadete'); setSearch(''); setOpen(true); }} style={styles.control}><Text style={styles.text}>{value || 'Seleccionar categoría'} ▾</Text></Pressable>
  <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><SafeAreaView style={styles.safe}>
   <View style={styles.header}><Text style={styles.title}>Categoría del equipo</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.close}><Text style={styles.text}>Cerrar</Text></Pressable></View>
   <Choice options={[...categoryGroups]} value={group} onChange={next => { setGroup(next as CategoryGroup); }} />
   <TextInput accessibilityLabel="Buscar categoría" placeholder="Buscar categoría" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} style={styles.control} />
   <Text style={styles.hint}>Comunidad Valenciana · FFCV · Fútbol 11 masculino</Text>
   <FlatList data={filtered} keyExtractor={item => item.value} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: value === item.value }} onPress={() => { onChange(item.value); setOpen(false); }} style={[styles.control, value === item.value && styles.selected]}><Text style={styles.text}>{item.label}</Text><Text style={styles.hint}>{item.territory}</Text></Pressable>} ListEmptyComponent={<Text style={styles.hint}>No hay categorías que coincidan con los filtros.</Text>} />
  </SafeAreaView></Modal></>;
}
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
const styles = StyleSheet.create({
 safe: { flex: 1, backgroundColor: colors.background, padding: 20 },
 header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
 title: { color: colors.white, fontSize: 22, fontWeight: '800', flex: 1 }, close: { padding: 12 },
 label: { color: colors.muted, marginVertical: 8 }, text: { color: colors.white, lineHeight: 22 },
 hint: { color: colors.muted, lineHeight: 19, marginVertical: 6, fontSize: 12 },
 control: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 14, marginVertical: 6, color: colors.white },
 selected: { borderColor: colors.red },
});
