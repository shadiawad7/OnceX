import type { FederationGroup } from '../lib/federationCatalog';
export type FederationGroupBrowserProps={sourceUrl?:string;season?:string|null;teamName:string;onClose:()=>void;onSave:(group:FederationGroup)=>Promise<void>};
