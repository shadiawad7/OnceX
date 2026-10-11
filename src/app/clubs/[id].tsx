import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { router, useLocalSearchParams } from 'expo-router';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { client, listTeams } from '../../lib/hierarchy';
export default function ClubPage() {
 const { id } = useLocalSearchParams<{ id: string }>();
 return <AccountShell allowed={['super_admin','club_admin']} fallback="/clubs">{account => <ClubTeams id={id} manage={account.primaryRole === 'super_admin'} />}</AccountShell>;
}
function ClubTeams({ id, manage }: { id: string; manage: boolean }) {
 const [name, setName] = useState('Club');
 useEffect(() => { let active = true; client().from('clubs').select('name').eq('id',id).single().then(result => { if (active && result.data) setName(result.data.name); }); return () => { active = false; }; }, [id]);
 const load = useCallback((page: number, search: string) => listTeams(id, page, search), [id]);
 return <View style={{ flex: 1 }}>{manage && <Pressable accessibilityRole="button" style={{ paddingHorizontal: 22, paddingBottom: 16 }} onPress={() => router.push({ pathname: '/manage-container', params: { kind: 'club', id } })}><Text style={{ color: colors.redBright }}>Editar club y plan</Text></Pressable>}<HierarchyList title={name} description="Equipos del club" load={load} empty="Este club está vacío. Crea su primer equipo." onSelect={item => router.push({ pathname: '/teams/[id]', params: { id: item.id } })} onCreate={() => router.push({ pathname: '/create-account', params: { kind: 'team', clubId: id } })} createLabel="CREAR EQUIPO" /></View>;
}
