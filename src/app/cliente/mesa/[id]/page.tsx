import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientMesaView from './ClientMesaView'

export const revalidate = 0

export default async function ClienteMesaPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: table } = await supabase.from('tables').select('*').eq('id', id).single()

  if (!table) {
    notFound()
  }

  return <ClientMesaView table={table} />
}
