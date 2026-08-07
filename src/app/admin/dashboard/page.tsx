import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const revalidate = 0

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Buscar mesas abertas com suas comandas e itens pendentes/entregues
  const { data: openOrders } = await supabase
    .from('orders')
    .select('*, tables(*), order_items(*, products(*), profiles(name)), profiles(name)')
    .eq('status', 'aberta')
    .order('opened_at', { ascending: false })

  // Buscar faturamento fechado de hoje
  const today = new Date()
  today.setHours(0,0,0,0)
  
  const { data: closedOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('status', 'fechada')
    .gte('closed_at', today.toISOString())

  const totalFechado = closedOrders?.reduce((acc, order) => acc + Number(order.total), 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-200">Visão Geral</h1>
      </div>
      
      <DashboardClient initialOrders={openOrders || []} initialTotalFechado={totalFechado} />
    </div>
  )
}
