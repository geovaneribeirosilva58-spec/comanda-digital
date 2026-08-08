import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Clock, CheckCircle, Trash, RefreshCcw } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { deleteOrderItem, reopenOrder } from '@/app/garcom/actions'

export const revalidate = 0

export default async function ComandaPage({ params }: { params: { id: string } }) {
  const { id: tableId } = await params
  const supabase = await createClient()

  const { data: table } = await supabase.from('tables').select('*').eq('id', tableId).single()
  
  // Buscar comanda aberta para esta mesa
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*), profiles(name))')
    .eq('table_id', tableId)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)

  let order = orders?.[0]
  let todayClosedOrders: any[] = []

  if (!order) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: closedOrders } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*), profiles(name))')
      .eq('table_id', tableId)
      .eq('status', 'fechada')
      .gte('closed_at', today.toISOString())
      .order('closed_at', { ascending: false })
      
    todayClosedOrders = closedOrders || []
  }

  const total = order?.order_items?.reduce((acc: number, item: any) => acc + (item.status !== 'cancelado' ? item.unit_price * item.quantity : 0), 0) || 0

  async function markDelivered(formData: FormData) {
    'use server'
    const itemIdsStr = formData.get('itemIds') as string
    const itemIds = itemIdsStr.split(',')
    const supabase = await createClient()
    await supabase.from('order_items').update({ status: 'entregue' }).in('id', itemIds)
    revalidatePath(`/admin/mesas/${tableId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/mesas" className="flex items-center text-slate-400 hover:text-amber-500 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Voltar
        </Link>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${table?.status === 'aberta' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
          {table?.status === 'aberta' ? 'OCUPADA' : 'LIVRE'}
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-amber-500">Mesa {table?.name}</h1>
        {order && <p className="text-slate-400 text-sm mt-1">Comanda #{order.id.split('-')[0]}</p>}
      </div>

      <div className="max-w-lg w-full">
        <Link href={`/admin/mesas/${tableId}/cardapio`}>
          <Button size="lg" className="w-full text-lg h-14 font-bold tracking-wide">
            <Plus className="w-6 h-6 mr-2" />
            LANÇAR PRODUTO
          </Button>
        </Link>
      </div>

      <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-slate-300">Itens Lançados</h2>
          <span className="font-bold text-amber-500 text-lg">R$ {total.toFixed(2)}</span>
        </div>
        
        <div className="divide-y divide-slate-800/50">
          {!order ? (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
              <p className="text-slate-500">Nenhum item ativo nesta mesa.</p>
              
              {todayClosedOrders.length > 0 && (
                <div className="w-full mt-6 space-y-4 flex flex-col items-center">
                  <h3 className="font-bold text-slate-300 text-sm w-full text-center border-b border-slate-800 pb-2">
                    Comandas Fechadas Hoje
                  </h3>
                  {todayClosedOrders.map((closedOrder: any) => (
                    <div key={closedOrder.id} className="bg-slate-950 p-5 rounded-xl border border-slate-800 max-w-sm w-full shadow-lg relative overflow-hidden group text-left">
                      <div className="absolute top-0 left-0 w-1 h-full bg-slate-700 group-hover:bg-amber-500 transition-colors"></div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-1">Comanda #{closedOrder.id.split('-')[0]}</h4>
                          <p className="text-slate-500 text-xs">{new Date(closedOrder.closed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <p className="text-amber-500 font-black text-xl">R$ {(Number(closedOrder.total) > 0 ? Number(closedOrder.total) : (closedOrder.order_items?.reduce((acc: number, oi: any) => acc + (oi.status !== 'cancelado' ? oi.quantity * oi.unit_price : 0), 0) || 0)).toFixed(2)}</p>
                      </div>
                      
                      <div className="text-xs text-slate-400 mb-4 line-clamp-2">
                        {(() => {
                          const groupedClosedItems = closedOrder.order_items?.reduce((acc: any[], item: any) => {
                            const existing = acc.find(i => 
                              i.product_id === item.product_id && 
                              i.status === item.status && 
                              i.note === item.note
                            )
                            if (existing) {
                              existing.quantity += item.quantity
                            } else {
                              acc.push({ ...item })
                            }
                            return acc
                          }, []) || []
                          return groupedClosedItems.map((i: any) => `${i.quantity}x ${i.products?.name} (${i.profiles?.name || 'Desconhecido'})`).join(', ')
                        })()}
                      </div>

                      <form action={reopenOrder.bind(null, closedOrder.id, tableId)}>
                        <Button variant="secondary" className="w-full bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50">
                          <RefreshCcw className="w-4 h-4 mr-2" />
                          Desfazer Fechamento
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : order.order_items?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              A comanda está aberta, mas nenhum item foi lançado ainda.
            </div>
          ) : (
            (() => {
              const groupedItems = order.order_items?.reduce((acc: any[], item: any) => {
                const existing = acc.find(i => 
                  i.product_id === item.product_id && 
                  i.status === item.status && 
                  i.note === item.note
                )
                if (existing) {
                  existing.quantity += item.quantity
                  existing.groupedIds.push(item.id)
                } else {
                  acc.push({
                    ...item,
                    groupedIds: [item.id]
                  })
                }
                return acc
              }, []) || []

              return groupedItems.map((item: any) => (
                <div key={item.groupedIds.join('-')} className="p-4 flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-200 flex items-center">
                      <span className="bg-slate-800 text-amber-500 text-xs font-bold px-2 py-0.5 rounded mr-2 border border-slate-700">
                        {item.quantity}x
                      </span>
                      {item.products?.name}
                      <span className="text-slate-500 text-xs ml-2 uppercase">({item.profiles?.name || 'Desconhecido'})</span>
                    </div>
                    {item.note && (
                      <p className="text-sm text-amber-500/70 mt-1 italic">Obs: {item.note}</p>
                    )}
                    <div className="mt-2">
                      {item.status === 'pendente' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3 mr-1"/> Pendente
                          </span>
                          <form action={markDelivered}>
                            <input type="hidden" name="itemIds" value={item.groupedIds.join(',')} />
                            <button type="submit" className="text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-slate-900 border border-emerald-500/50 px-2 py-0.5 rounded transition-colors">
                              ✔ Marcar Entregue
                            </button>
                          </form>
                        </div>
                      )}
                      {item.status === 'entregue' && <span className="inline-flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded"><CheckCircle className="w-3 h-3 mr-1"/> Entregue</span>}
                      {item.status === 'cancelado' && <span className="inline-flex items-center text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">Cancelado</span>}
                      
                      <form action={deleteOrderItem.bind(null, item.groupedIds[0], order.id, item.unit_price * item.quantity, tableId)} className="mt-2">
                        <button type="submit" className="inline-flex items-center text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/50 px-2 py-1 rounded transition-colors">
                          <Trash className="w-3 h-3 mr-1"/> Remover
                        </button>
                      </form>
                    </div>
                  </div>
                  <div className="font-semibold text-amber-500">
                    R$ {(item.unit_price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            })()
          )}
        </div>
      </div>
    </div>
  )
}
