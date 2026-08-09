'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addItemsToOrder(orderId: string, items: any[], assignedWaiterId?: string) {
  const supabase = await createClient()

  const { data: orderCheck } = await supabase.from('orders').select('status').eq('id', orderId).single()
  if (orderCheck?.status === 'fechada') {
    throw new Error('Esta comanda já foi finalizada e não pode receber novos itens.')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  let finalWaiterId = user.id
  if (profile?.role === 'admin' && assignedWaiterId) {
    finalWaiterId = assignedWaiterId
  }

  // Mapear os itens para inserção
  const orderItemsData = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    note: item.note || null,
    status: 'pendente',
    waiter_id: finalWaiterId
  }))

  const { error } = await supabase.from('order_items').insert(orderItemsData)

  if (error) {
    console.error('Erro ao adicionar itens:', error)
    throw new Error('Falha ao enviar pedido')
  }

  // Removido: Atualização manual do `orders.total` para evitar Race Conditions.
  // O faturamento agora é sempre calculado somando-se os `order_items` em tempo real.
}

export async function openTableAndAddItems(tableId: string, items: any[], assignedWaiterId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autenticado')

  // 1. Marcar mesa como aberta
  await supabase.from('tables').update({ status: 'aberta' }).eq('id', tableId)

  // 2. Verificar se já existe uma comanda aberta para esta mesa
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)

  let orderId;

  let finalWaiterId = user.id
  
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin' && assignedWaiterId) {
    finalWaiterId = assignedWaiterId
  }

  if (existingOrders && existingOrders.length > 0) {
    orderId = existingOrders[0].id
  } else {
    // Buscar o nome da mesa atual para congelar na comanda
    const { data: tableData } = await supabase.from('tables').select('name').eq('id', tableId).single()

    // 3. Criar order se não existir
    const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
      table_id: tableId,
      waiter_id: finalWaiterId,
      status: 'aberta',
      table_name_snapshot: tableData?.name || 'Mesa Desconhecida'
    }).select().single()

    if (orderError || !newOrder) throw new Error('Erro ao criar comanda')
    orderId = newOrder.id
  }

  // 4. Adicionar itens
  await addItemsToOrder(orderId, items, assignedWaiterId)

  revalidatePath(`/garcom/mesas`)
  revalidatePath(`/garcom/mesas/${tableId}`)
  revalidatePath(`/admin/mesas`)
  revalidatePath(`/admin/mesas/${tableId}`)
}

export async function deleteOrderItem(itemId: string, orderId: string, itemTotal: number, tableId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Não autenticado')

  // Verify if it's an admin (Optional but good practice, the UI already restricts it)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sem permissão para remover itens')

  // Removido: Atualização manual do `orders.total` para evitar Race Conditions.
  // O faturamento agora é calculado somando-se os `order_items` em tempo real.

  // Delete item
  await supabase.from('order_items').delete().eq('id', itemId)

  revalidatePath(`/admin/mesas/${tableId}`)
  revalidatePath(`/admin/dashboard`)
}

export async function reopenOrder(orderId: string, tableId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Não autenticado')

  // Verify if it's an admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sem permissão para reabrir comandas')

  // Reopen table
  await supabase.from('tables').update({ status: 'aberta' }).eq('id', tableId)
  
  // Reopen order (clear closed_at)
  await supabase.from('orders').update({ 
    status: 'aberta',
    closed_at: null 
  }).eq('id', orderId)

  revalidatePath(`/admin/mesas`)
  revalidatePath(`/admin/mesas/${tableId}`)
  revalidatePath(`/garcom/mesas`)
  revalidatePath(`/admin/dashboard`)
}

export async function addPartialPaymentServer(orderId: string, amount: number, tableId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Não autenticado')

  // Verify se é admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sem permissão para receber pagamentos parciais')

  await supabase.from('order_items').insert([{
    order_id: orderId,
    quantity: 1,
    unit_price: -amount,
    status: 'entregue',
    note: 'Pagamento Parcial'
  }])

  revalidatePath(`/admin/mesas/${tableId}`)
  revalidatePath(`/admin/dashboard`)
  revalidatePath(`/garcom/mesas/${tableId}`)
}
