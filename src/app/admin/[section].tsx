import { Redirect, useLocalSearchParams } from 'expo-router';
import AdminShell from '../../components/AdminShell';
import AdminManager from '../../components/AdminManager';
import { adminSections, type AdminSection } from '../../lib/admin';

export default function AdminSectionPage() {
 const { section } = useLocalSearchParams<{ section: string }>();
 if (!section || !Object.hasOwn(adminSections, section)) return <Redirect href="/admin" />;
 if (section === 'plans') return <Redirect href="/admin/team-plans" />;
 if (section === 'activity') return <Redirect href="/admin" />;
 if (['users','clubs','teams','coaches','players'].includes(section)) return <Redirect href="/clubs" />;
 return <AdminShell fallback="/admin"><AdminManager key={section} section={section as AdminSection} /></AdminShell>;
}
