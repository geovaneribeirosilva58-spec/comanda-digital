import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  // 1. Verify Vercel Cron Authentication
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminAuth = createAdminClient()

    // 2. Apagar todas as chamadas de garçom em aberto
    await adminAuth.from('table_calls').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // 3. Buscar todas as vendas que NÃO estão fechadas (abandonadas/abertas)
    const { data: openOrders } = await adminAuth.from('orders').select('id').neq('status', 'fechada')
    
    if (openOrders && openOrders.length > 0) {
      const orderIds = openOrders.map(o => o.id)
      // Deletar os itens dessas vendas abertas
      await adminAuth.from('order_items').delete().in('order_id', orderIds)
      // Deletar as vendas abertas
      await adminAuth.from('orders').delete().in('id', orderIds)
    }

    // 4. Resetar todas as mesas para o estado inicial
    await adminAuth.from('tables').update({
      active: false,
      status: 'livre'
    }).neq('id', '00000000-0000-0000-0000-000000000000') // Atualiza todas as mesas

    return NextResponse.json({ success: true, message: 'Tabelas resetadas e vendas abertas limpas com sucesso.' })
  } catch (error: any) {
    console.error('Erro no cron job reset-tables:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
