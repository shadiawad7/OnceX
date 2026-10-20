import { supabase } from './supabase';

export function client() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}
