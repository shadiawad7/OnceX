import { useLocalSearchParams } from 'expo-router';
import AccountShell from '../components/AccountShell';
import PlayerRankings from '../components/PlayerRankings';
export default function RankingsPage() {
 const {clubId}=useLocalSearchParams<{clubId?:string}>();
 return <AccountShell>{account=><PlayerRankings clubId={clubId} canOpenProfiles={account.primaryRole!=='player'}/>}</AccountShell>;
}
