import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import AccountShell from './AccountShell';
export default function AdminShell({children,fallback='/login'}:{children:ReactNode;fallback?:Href}) {
 return <AccountShell allowed={['super_admin']} fallback={fallback}>{()=>children}</AccountShell>;
}
