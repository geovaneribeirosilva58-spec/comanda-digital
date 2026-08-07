'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Receipt, UtensilsCrossed, CheckCircle, Clock, Banknote, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardClient({ initialOrders, initialTotalFechado }: { initialOrders: any[], initialTotalFechado: number }) {
  const [orders, setOrders] = useState(initialOrders || [])
  const [totalFechado, setTotalFechado] = useState(initialTotalFechado || 0)
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
      .select('total')
      .eq('status', 'fechada')
      .gte('closed_at', today.toISOString())
    if (closedData) {
      setTotalFechado(closedData.reduce((acc, o) => acc + Number(o.total), 0))
    }
  }

  useEffect(() => {
    // Inicializar na montagem para garantir sincronia caso algo tenha mudado
    fetchOrders()

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

  const pendingItems = orders.flatMap(order => 
    (order.order_items || [])
      .filter((i: any) => i.status === 'pendente')
      .map((i: any) => ({ ...i, table_name: order.tables?.name, order_id: order.id }))
  ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalFaturamentoAberto = orders.reduce((acc: number, order: any) => {
    const orderTotal = order.order_items?.reduce((itemAcc: number, oi: any) => itemAcc + (oi.status !== 'cancelado' ? oi.unit_price * oi.quantity : 0), 0) || 0
    return acc + orderTotal
  }, 0)

  const markAsDelivered = async (itemId: string) => {
    await supabase.from('order_items').update({ status: 'entregue' }).eq('id', itemId)
  }

  const closeOrder = async (orderId: string, tableId: string, orderTotal: number, hasPending: boolean) => {
    if (hasPending) {
      if(!confirm(`ATENÇÃO: Esta mesa possui itens pendentes (ainda não entregues)!\n\nTem certeza que deseja fechar a comanda no valor de R$ ${orderTotal.toFixed(2)} mesmo assim?`)) return;
    } else {
      if(!confirm(`Tem certeza que deseja fechar esta comanda no valor de R$ ${orderTotal.toFixed(2)}?`)) return;
    }
    
    // 1. Fechar a comanda
    await supabase.from('orders').update({ 
      status: 'fechada', 
      closed_at: new Date().toISOString() 
    }).eq('id', orderId)

    // 2. Liberar a mesa
    await supabase.from('tables').update({ status: 'livre' }).eq('id', tableId)
    
    // A tela vai recarregar sozinha pelos websockets, mas forçamos um fetch
    fetchOrders()
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
          <h2 className="text-xl font-bold mb-4 flex items-center text-slate-300">
            <Receipt className="mr-2 h-5 w-5 text-amber-500" />
            Comandas Abertas
          </h2>
          <div className="bg-slate-900 rounded-lg border border-slate-800 shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Nenhuma comanda aberta.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {orders.map((order: any) => {
                  const orderTotal = order.order_items?.reduce((itemAcc: number, oi: any) => itemAcc + (oi.status !== 'cancelado' ? oi.unit_price * oi.quantity : 0), 0) || 0
                  return (
                  <div key={order.id} className="p-5 hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="font-bold text-2xl text-amber-500 block mb-1">
                          Mesa {order.table_name_snapshot || order.tables?.name || 'Desconhecida'}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded">
                          Garçom: {order.profiles?.name || 'Desconhecido'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-slate-200 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 block mb-2">
                          R$ {orderTotal.toFixed(2)}
                        </span>
                        <Button 
                          onClick={() => {
                            const hasPending = order.order_items?.some((oi: any) => oi.status === 'pendente')
                            closeOrder(order.id, order.tables.id, orderTotal, !!hasPending)
                          }}
                          variant="destructive"
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-bold"
                        >
                          <CheckSquare className="w-4 h-4 mr-2" />
                          FINALIZAR
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950 rounded p-4 text-sm border border-slate-800/50">
                      <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Itens da Comanda:</h4>
                      {order.order_items && order.order_items.length > 0 ? (
                        <ul className="space-y-2">
                          {order.order_items.map((oi: any) => (
                            <li key={oi.id} className={`flex justify-between items-center ${oi.status === 'cancelado' ? 'text-red-400/50 line-through' : 'text-slate-300'}`}>
                              <span className="flex-1">
                                <span className="font-bold text-amber-500 mr-2">{oi.quantity}x</span> 
                                {oi.products?.name}
                                <span className="text-slate-500 text-[10px] ml-1 uppercase">({oi.profiles?.name || 'Desconhecido'})</span>
                                {oi.status === 'pendente' && <span className="ml-2 text-yellow-500 text-[10px] font-bold uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Pendente</span>}
                                {oi.status === 'entregue' && <span className="ml-2 text-emerald-500 text-[10px] font-bold uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Entregue</span>}
                              </span>
                              <span className="text-slate-400 font-medium whitespace-nowrap ml-4">R$ {(oi.unit_price * oi.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="italic text-slate-500">Nenhum item lançado.</span>
                      )}
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
                  <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
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
                      onClick={() => markAsDelivered(item.id)}
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
