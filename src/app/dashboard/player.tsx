import AccountShell from '../../components/AccountShell';
import PlayerProfile from '../../components/PlayerProfile';
export default function PlayerDashboard() {
 return <AccountShell allowed={['player']} fallback="/login">{account => <PlayerProfile key={account.userId} id={account.userId} viewerRole={account.primaryRole}/>}</AccountShell>;
}
