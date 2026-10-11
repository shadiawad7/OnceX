import { useCallback } from 'react';
import { Pressable, Text } from 'react-native';
import { colors } from '../theme/colors';
import { router } from 'expo-router';
import AccountShell from './AccountShell';
import HierarchyList from './HierarchyList';
import { listTeams } from '../lib/hierarchy';
import type { RoleCode } from '../lib/access';
export default function RoleTeamsDashboard({ role, title, description }: { role: RoleCode; title: string; description: string }) {
 const load = useCallback((page: number, search: string) => listTeams(undefined, page, search), []);
 return <AccountShell allowed={[role]} fallback="/login">{() => <><Pressable accessibilityRole="button" onPress={() => router.push('/rankings')} style={{ padding: 20 }}><Text style={{ color: colors.redBright, fontWeight: '800' }}>VER RANKINGS ONCEX →</Text></Pressable><HierarchyList title={title} description={description} load={load} empty="Todavía no tienes equipos asignados." onSelect={item => router.push({ pathname: '/teams/[id]', params: { id: item.id } })} /></>}</AccountShell>;
}
