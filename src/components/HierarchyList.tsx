import PersonAvatar from './PersonAvatar';
import SportCardBackground from './SportCardBackground';
import BlendedCardBackground from './BlendedCardBackground';
import type { ReactNode } from 'react';
import { listPages } from '../lib/listPages';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import { colors } from '../theme/colors';
import type { HierarchyItem } from '../lib/hierarchy';
import { adminError } from '../lib/admin';

type Result = { items: HierarchyItem[]; count: number };
export default function HierarchyList({ title, description, load, onSelect, onCreate, createLabel, empty, header, leading, sporty = false }: {
 sporty?: boolean; title: string; description?: string; load: (page: number, search: string) => Promise<Result>;
 onSelect: (item: HierarchyItem) => void; onCreate?: () => void; createLabel?: string; empty: string; header?: ReactNode; leading?: (item: HierarchyItem) => ReactNode;
}) {
 const [search, setSearch] = useState('');
 const [result, setResult] = useState<Result | null>(null);
 const [error, setError] = useState('');
 const [version, setVersion] = useState(0);
 useFocusEffect(useCallback(() => {
  let active = true;
  const timer = setTimeout(() => {
   listPages(page => load(page, search), () => active).then(data => { if (active) { setResult(data); setError(''); } }).catch(reason => { if (active) { setResult(null); setError(adminError(reason)); } });
  }, 250);
  return () => { active = false; clearTimeout(timer); };
 // Reattempts intentionally start a new scoped request.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [load, search, version]));
 return <FlatList data={result?.items ?? []} keyExtractor={item => `${item.id}-${item.role ?? ''}`} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} ListHeaderComponent={<View>{header}<Text style={styles.title}>{title}</Text>{description && <Text style={styles.body}>{description}</Text>}<TextInput accessibilityLabel="Buscar por nombre" placeholder="Buscar por nombre" placeholderTextColor={colors.muted} value={search} onChangeText={value => { setSearch(value); setResult(null); }} style={styles.input} />{onCreate && <Button label={createLabel ?? 'CREAR'} onPress={onCreate} />}{error ? <><Text style={styles.body}>{error}</Text><Button label="REINTENTAR" onPress={() => { setError(''); setVersion(value => value + 1); }} /></> : !result ? <ActivityIndicator color={colors.red} style={styles.loading} /> : <Text style={styles.body}>{result.count} registros</Text>}</View>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={[styles.card,(leading||item.role==='coach'||item.role==='player')&&styles.cardRow,sporty&&styles.sportCard]}>{sporty ? <SportCardBackground /> : <BlendedCardBackground />}{leading ? leading(item) : (item.role==='coach'||item.role==='player') ? <PersonAvatar key={item.photoUrl??item.id} url={item.photoUrl} name={item.name}/> : null}<View style={(leading||item.role==='coach'||item.role==='player')?styles.cardText:undefined}><Text style={styles.label}>{item.name} →</Text>{item.subtitle && <Text style={styles.subtitle}>{item.subtitle}</Text>}</View></Pressable>} ListEmptyComponent={result && !error ? <Text style={styles.body}>{empty}</Text> : undefined} />;
}
const styles = StyleSheet.create({ sportCard: { borderRadius: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomRightRadius: 28, borderBottomLeftRadius: 28, overflow: 'hidden', padding: 18, minHeight: 92 }, cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8 }, cardText: { flex: 1 }, content: { padding: 22, paddingTop: 0, paddingBottom: 40 }, title: { color: colors.white, fontSize: 28, fontWeight: '800' }, body: { color: colors.muted, lineHeight: 22, marginVertical: 10 }, input: { color: colors.white, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginVertical: 10 }, card: { padding: 18, borderWidth: 0, borderColor: colors.border, borderRadius: 18, backgroundColor: 'transparent', marginTop: 12 }, subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }, label: { color: colors.white, fontWeight: '700', fontSize: 16 }, pagination: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }, link: { color: colors.redBright, padding: 10 }, loading: { margin: 20 } });
