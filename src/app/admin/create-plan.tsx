import AdminShell from '../../components/AdminShell';
import AdminManager from '../../components/AdminManager';
export default function CreatePlan(){return <AdminShell fallback="/admin/team-plans"><AdminManager section="plans" initialCreate /></AdminShell>;}
