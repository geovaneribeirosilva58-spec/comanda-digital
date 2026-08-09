'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function callWaiter(tableId: string, type: 'garcom' | 'cerveja') {
  // Bypass RLS to allow unauthenticated customers to call the waiter
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.from('table_calls').insert({
    table_id: tableId,
    status: 'pendente',
    call_type: type
  })

  if (error) {
    throw new Error(error.message)
  }
}
