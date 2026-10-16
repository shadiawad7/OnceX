import AccountShell from '../../components/AccountShell';
import PlayerTeamCards from '../../components/PlayerTeamCards';
export default function PlayerTeams() {return <AccountShell allowed={['player']} fallback="/login">{()=> <PlayerTeamCards/>}</AccountShell>;}
