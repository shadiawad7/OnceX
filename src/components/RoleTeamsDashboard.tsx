import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, playerIconBackgroundColor, playerIconOpacityPercent, playerIconBorderOpacityPercent, playerColorWithOpacity } from '../theme/colors';
import { router } from 'expo-router';
import AccountShell from './AccountShell';
import HierarchyList from './HierarchyList';
import { listTeams } from '../lib/hierarchy';
import type { RoleCode } from '../lib/access';
export default function RoleTeamsDashboard({ role, title, description }: { role: RoleCode; title: string; description: string }) {
 const load = useCallback((page: number, search: string) => listTeams(undefined, page, search), []);
 return <AccountShell allowed={[role]} fallback="/login">{() => <><Pressable accessibilityRole="button" onPress={() => router.push('/rankings')} style={{ padding: 20 }}><Text style={{ color: colors.redBright, fontWeight: '800' }}>VER RANKINGS ONCEX →</Text></Pressable><HierarchyList sporty={role==='coach'} leading={role==='coach' ? () => <View style={{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:playerColorWithOpacity('#00FF66',playerIconBorderOpacityPercent),backgroundColor:playerIconBackgroundColor,alignItems:'center',justifyContent:'center'}}><MaterialCommunityIcons name="soccer-field" size={23} color={playerColorWithOpacity('#00FF66',playerIconOpacityPercent)} /></View> : undefined} title={title} description={description} load={load} empty="Todavía no tienes equipos asignados." onSelect={item => router.push({ pathname: '/teams/[id]', params: { id: item.id } })} /></>}</AccountShell>;
}
