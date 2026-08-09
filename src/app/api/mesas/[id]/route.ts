import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Usar o service_role_key para ignorar RLS e garantir a exclusão em cascata
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Buscar comandas vinculadas
    const { data: orders } = await supabaseAdmin.from('orders').select('id').eq('table_id', id)
    
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id)
      
      // 2. Apagar itens das comandas (em lotes de 1000 se necessário, mas para pequenos volumes .in() funciona)
      const { error: itemsError } = await supabaseAdmin.from('order_items').delete().in('order_id', orderIds)
      if (itemsError) throw itemsError
    }

    // 3. Apagar as comandas
    const { error: ordersError } = await supabaseAdmin.from('orders').delete().eq('table_id', id)
    if (ordersError) throw ordersError

    // 4. Apagar a mesa
    const { error: tableError } = await supabaseAdmin.from('tables').delete().eq('id', id)
    if (tableError) throw tableError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting table:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
