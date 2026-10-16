import { useLocalSearchParams } from 'expo-router';
import AccountShell from '../../components/AccountShell';
import PlayerProfile from '../../components/PlayerProfile';
export default function PlayerPage() {
 const {id}=useLocalSearchParams<{id:string}>();
 return <AccountShell>{account => <PlayerProfile key={id} id={id} viewerRole={account.primaryRole}/>}</AccountShell>;
}
