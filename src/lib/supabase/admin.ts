import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com permissÃµes de Admin (Bypass RLS)
// IMPORTANTE: SÃ³ deve ser usado no lado do servidor em rotas protegidas!
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
