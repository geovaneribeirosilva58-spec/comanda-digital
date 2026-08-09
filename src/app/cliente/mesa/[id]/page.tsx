import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ClientMesaView from './ClientMesaView'

export const revalidate = 0

export default async function ClienteMesaPage({ params }: { params: { id: string } }) {
  const { id } = await params
  
  // Bypass RLS using service_role_key in Server Component
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: table } = await supabase.from('tables').select('*').eq('id', id).single()

  if (!table) {
    notFound()
  }

  return <ClientMesaView table={table} />
}
