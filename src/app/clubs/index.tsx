import ClubBadge from '../../components/ClubBadge';
import { router } from 'expo-router';
import AccountShell from '../../components/AccountShell';
import HierarchyList from '../../components/HierarchyList';
import { listClubs } from '../../lib/hierarchy';
export default function ClubsPage() {
 return <AccountShell allowed={['super_admin','club_admin']} fallback="/login">{account => <HierarchyList sporty leading={item=><ClubBadge key={item.photoUrl??item.id} url={item.photoUrl} name={item.name} size={58}/>} title={account.primaryRole==='super_admin'?'Usuarios':'Clubes'} description="Clubes → Equipos → Entrenadores → Jugadores" load={listClubs} empty="Todavía no hay clubes." onSelect={item => router.push({ pathname: '/clubs/[id]', params: { id: item.id } })} onCreate={account.primaryRole === 'super_admin' ? () => router.push({ pathname: '/create-account', params: { kind: 'club' } }) : undefined} createLabel="CREAR CLUB" />}</AccountShell>;
}
