import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export const revalidate = 0

export default async function AdminRelatoriosPage() {
  const supabase = await createClient()

  // Buscar comandas fechadas e seus itens
  const { data: closedOrders } = await supabase
    .from('orders')
    .select('id, total, closed_at, waiter_id, profiles(name), order_items(product_id, quantity, unit_price, status, products(name), profiles(name))')
    .eq('status', 'fechada')
    .order('closed_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-500">Relatórios de Vendas</h1>
      </div>

      {/* Client Component com Recharts */}
      <ReportsClient data={closedOrders || []} />
    </div>
  )
}
