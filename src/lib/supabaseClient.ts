import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// No frontend, usamos EXCLUSIVAMENTE VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
// NUNCA importar nem utilizar SERVICE_ROLE_KEY no frontend!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('placeholder')
);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sessao_certa_supabase_auth'
  }
});

/**
 * Obtém o access_token JWT atual para incluir no cabeçalho Authorization: Bearer <token>
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (err) {
    console.warn('[AUTH CLIENT] Falha ao recuperar token JWT da sessão:', err);
    return null;
  }
}

/**
 * Obtém o usuário atual autenticado
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.warn('[AUTH CLIENT] Falha ao recuperar usuário do Supabase:', err);
    return null;
  }
}
