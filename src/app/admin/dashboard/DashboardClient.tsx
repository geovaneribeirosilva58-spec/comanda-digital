'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Receipt, UtensilsCrossed, CheckCircle, Clock, Banknote, CheckSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DashboardClient({ initialOrders, initialTotalFechado }: { initialOrders: any[], initialTotalFechado: number }) {
  const [orders, setOrders] = useState(initialOrders || [])
  const [totalFechado, setTotalFechado] = useState(initialTotalFechado || 0)
  const [isPending, setIsPending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  // Função para recarregar as comandas
  const fetchOrders = async () => {
    // Abertas
    const { data: openData } = await supabase
      .from('orders')
      .select('*, tables(*), order_items(*, products(*), profiles(name)), profiles(name)')
      .eq('status', 'aberta')
      .order('opened_at', { ascending: false })
    if (openData) setOrders(openData)

    // Fechadas (Hoje)
    const today = new Date()
    today.setHours(0,0,0,0)
    const { data: closedData } = await supabase
      .from('orders')
      .select('total, order_items(quantity, unit_price, status)')
      .eq('status', 'fechada')
      .gte('closed_at', today.toISOString())
    if (closedData) {
      setTotalFechado(closedData.reduce((acc, o) => {
        let orderTotal = Number(o.total) || 0
        if (orderTotal === 0 && o.order_items) {
          orderTotal = o.order_items.reduce((iAcc: number, oi: any) => iAcc + (oi.status !== 'cancelado' ? oi.quantity * oi.unit_price : 0), 0)
        }
        return acc + orderTotal
      }, 0))
    }
  }

  useEffect(() => {
    // Inicializar na montagem para garantir sincronia caso algo tenha mudado
    void Promise.resolve().then(() => fetchOrders())

    const itemsSubscription = supabase
      .channel('order_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchOrders()
      })
      .subscribe()

    const ordersSubscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(itemsSubscription)
      supabase.removeChannel(ordersSubscription)
    }
  }, [supabase])

  const pendingItems = (() => {
    const rawPending = orders.flatMap((o: any) => 
      (o.order_items || [])
        .filter((oi: any) => oi.status === 'pendente')
        .map((oi: any) => ({ ...oi, table_name: o.tables?.name }))
    ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return rawPending.reduce((acc: any[], item: any) => {
      const existing = acc.find(i => i.product_id === item.product_id && i.table_name === item.table_name && i.note === item.note)
      if (existing) {
        existing.quantity += item.quantity
        existing.groupedIds.push(item.id)
      } else {
        acc.push({ ...item, groupedIds: [item.id] })
      }
      return acc
    }, [])
  })()

  const totalFaturamentoAberto = orders.reduce((acc: number, order: any) => {
    const orderTotal = order.order_items?.reduce((itemAcc: number, oi: any) => itemAcc + (oi.status !== 'cancelado' && oi.unit_price > 0 ? oi.unit_price * oi.quantity : 0), 0) || 0
    return acc + orderTotal
  }, 0)

  const markAsDelivered = async (itemIds: string[]) => {
    await supabase.from('order_items').update({ status: 'entregue' }).in('id', itemIds)
  }

  const closeOrder = async (orderId: string, tableId: string | undefined, orderItems: any[]) => {
    if(!confirm("Deseja realmente fechar esta comanda?")) return;
    
    setIsPending(true)
    try {
      // Calcular total (incluindo pagamentos parciais)
      const finalTotal = orderItems.reduce((acc: number, item: any) => acc + (item.quantity * item.unit_price), 0)
      
      // O faturamento bruto do bar é a soma apenas dos itens positivos (produtos reais)
      const orderTotal = orderItems.reduce((acc: number, item: any) => {
        if (item.unit_price > 0) {
          return acc + (item.quantity * item.unit_price)
        }
        return acc
      }, 0)
      
      // 1. Fechar a comanda - gravamos o faturamento BRUTO na comanda
      await supabase.from('orders').update({ 
        status: 'fechada', 
        closed_at: new Date().toISOString(),
        total: orderTotal
      }).eq('id', orderId)

      // 2. Liberar a mesa
      if (tableId) {
        await supabase.from('tables').update({ status: 'livre' }).eq('id', tableId)
      }
      
      toast.success("Comanda fechada com sucesso!")
      fetchOrders()
    } catch (err: any) {
      toast.error("Erro ao fechar comanda: " + err.message)
    } finally {
      setIsPending(false)
    }
  }

  const addPartialPayment = async (orderId: string, remainingTotal: number) => {
    const amountStr = prompt(`QUAL O VALOR DO PAGAMENTO PARCIAL?\n\nFalta receber: R$ ${remainingTotal.toFixed(2)}\n\nDigite o valor usando ponto (ex: 50.00):`)
    if (!amountStr) return
    const amount = parseFloat(amountStr.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido!")
      return
    }

    setIsPending(true)
    try {
      await supabase.from('order_items').insert([{
        order_id: orderId,
        quantity: 1,
        unit_price: -amount,
        status: 'entregue',
        note: 'Pagamento Parcial'
      }])
      toast.success(`Pagamento parcial de R$ ${amount.toFixed(2)} registrado!`)
    } catch (err: any) {
      toast.error("Erro ao registrar pagamento: " + err.message)
    } finally {
      setIsPending(false)
    }
  }

  const deleteOrder = async (orderId: string, tableId: string | undefined) => {
    if(!confirm("TEM CERTEZA ABSOLUTA QUE DESEJA APAGAR ESTA COMANDA?\n\nEsta ação irá remover permanentemente a comanda e todos os seus itens do banco de dados, e não aparecerá nos relatórios.")) return;
    
    setIsPending(true)
    try {
      await supabase.from('order_items').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
      
      if (tableId) {
        await supabase.from('tables').update({ status: 'livre' }).eq('id', tableId)
      }
      
      toast.success("Comanda apagada com sucesso!")
      fetchOrders()
    } catch (err: any) {
      toast.error("Erro ao apagar comanda: " + err.message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-8">
      
      {/* Cards de Resumo */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        
        <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-400">Vendas de Hoje</h3>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">R$ {totalFechado.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-400">Total Aberto</h3>
            <UtensilsCrossed className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">R$ {totalFaturamentoAberto.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-400">Mesas Abertas</h3>
            <Receipt className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{orders.length}</div>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-slate-400">Fila (Cozinha)</h3>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{pendingItems.length}</div>
          </div>
        </div>
      </div>

      {/* Grid de 2 colunas: Comandas Abertas e Fila de Pedidos */}
      <div className="grid gap-8 xl:grid-cols-2">
        
        {/* Detalhes das Comandas */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold flex items-center text-slate-300 shrink-0">
              <Receipt className="mr-2 h-5 w-5 text-amber-500" />
              Comandas Abertas
            </h2>
            <div className="w-full sm:max-w-xs">
              <input 
                type="text" 
                placeholder="Pesquisar mesa..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Nenhuma comanda aberta.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {orders.filter((order: any) => {
                  const tableName = order.table_name_snapshot || order.tables?.name || 'Desconhecida'
                  return tableName.toLowerCase().includes(searchQuery.toLowerCase())
                }).map((order: any) => {
                  const orderTotalGross = order.order_items?.reduce((itemAcc: number, oi: any) => itemAcc + (oi.status !== 'cancelado' && oi.unit_price > 0 ? oi.unit_price * oi.quantity : 0), 0) || 0
                  const partialPayments = order.order_items?.reduce((itemAcc: number, oi: any) => itemAcc + (oi.status !== 'cancelado' && oi.unit_price < 0 ? Math.abs(oi.unit_price * oi.quantity) : 0), 0) || 0
                  const orderTotalRemaining = orderTotalGross - partialPayments
                  
                  return (
                  <div key={order.id} className="p-5 hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="font-bold text-2xl text-amber-500 block mb-1">
                          Mesa {order.table_name_snapshot || order.tables?.name || 'Desconhecida'}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded block w-fit mb-2">
                          Garçom: {order.profiles?.name || 'Desconhecido'}
                        </span>
                        {partialPayments > 0 && (
                          <div className="text-xs space-y-1">
                            <div className="text-slate-400">Gasto total: <span className="text-slate-300">R$ {orderTotalGross.toFixed(2)}</span></div>
                            <div className="text-emerald-500">Já pago: <span className="font-bold">R$ {partialPayments.toFixed(2)}</span></div>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Falta Receber</span>
                        <span className="font-bold text-2xl text-slate-200 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 block mb-3">
                          R$ {orderTotalRemaining.toFixed(2)}
                        </span>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => addPartialPayment(order.id, orderTotalRemaining)}
                            variant="secondary"
                            disabled={isPending}
                            size="sm"
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-bold"
                          >
                            <Banknote className="w-4 h-4 mr-2" />
                            Receber Parcial
                          </Button>
                          <Button 
                            onClick={() => {
                              closeOrder(order.id, order.tables?.id, order.order_items || [])
                            }}
                            variant="destructive"
                            disabled={isPending}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold"
                          >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            FINALIZAR
                          </Button>
                          <Button 
                            onClick={() => deleteOrder(order.id, order.tables?.id)}
                            variant="destructive"
                            disabled={isPending}
                            size="sm"
                            className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 hover:border-red-600 font-bold ml-2"
                            title="Apagar Comanda"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950 rounded p-4 text-sm border border-slate-800/50">
                      <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Itens da Comanda:</h4>
                      {(() => {
                        const groupedItems = (order.order_items || []).reduce((acc: any[], item: any) => {
                          const existing = acc.find(i => i.product_id === item.product_id && i.status === item.status && i.note === item.note)
                          if (existing) {
                            existing.quantity += item.quantity
                          } else {
                            acc.push({ ...item })
                          }
                          return acc
                        }, [])
                        
                        return groupedItems.length > 0 ? (
                          <ul className="space-y-2">
                            {groupedItems.map((oi: any) => (
                              <li key={oi.id} className={`flex justify-between items-center ${oi.status === 'cancelado' ? 'text-red-400/50 line-through' : 'text-slate-300'}`}>
                                <span className="flex-1">
                                  {oi.unit_price < 0 ? (
                                    <span className="text-emerald-500 font-bold uppercase">{oi.note || 'Pagamento Parcial'}</span>
                                  ) : (
                                    <>
                                      <span className="font-bold text-amber-500 mr-2">{oi.quantity}x</span> 
                                      {oi.products?.name}
                                      <span className="text-slate-500 text-[10px] ml-1 uppercase">({oi.profiles?.name || 'Desconhecido'})</span>
                                      {oi.status === 'pendente' && <span className="ml-2 text-yellow-500 text-[10px] font-bold uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Pendente</span>}
                                      {oi.status === 'entregue' && <span className="ml-2 text-emerald-500 text-[10px] font-bold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Entregue</span>}
                                    </>
                                  )}
                                </span>
                                <span className={oi.unit_price < 0 ? "text-emerald-500 font-bold whitespace-nowrap ml-4" : "text-slate-400 font-medium whitespace-nowrap ml-4"}>
                                  R$ {(oi.unit_price * oi.quantity).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="italic text-slate-500">Nenhum item lançado.</span>
                        )
                      })()}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

        {/* Fila de Pedidos */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center text-slate-300">
            <Clock className="mr-2 h-5 w-5 text-amber-500" />
            Fila de Pedidos (Cozinha/Bar)
          </h2>
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-hidden">
            {pendingItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Nenhum pedido pendente no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {pendingItems.map((item: any) => (
                  <div key={item.groupedIds.join('-')} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-bold text-xl text-slate-200 mb-1">
                        <span className="text-amber-500">{item.quantity}x</span> {item.products?.name}
                      </span>
                      <span className="text-base text-slate-400">
                        Mesa: <span className="font-semibold text-amber-500">{item.table_name || 'Desconhecida'}</span>
                      </span>
                      {item.note && (
                        <span className="text-sm text-amber-500/90 font-medium italic mt-2 bg-amber-500/10 px-2 py-1 rounded inline-block w-fit">
                          Obs: {item.note}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 mt-2">
                        Pedido às {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <button
                      onClick={() => markAsDelivered(item.groupedIds)}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 border border-transparent transition-all shrink-0 ml-4"
                      title="Marcar como entregue"
                    >
                      <CheckCircle className="w-8 h-8 mb-1" />
                      <span className="text-xs font-bold uppercase">Pronto</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
