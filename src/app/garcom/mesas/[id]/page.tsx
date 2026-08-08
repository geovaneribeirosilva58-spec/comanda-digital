import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Clock, CheckCircle } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export const revalidate = 0

export default async function ComandaPage({ params }: { params: { id: string } }) {
  const { id: tableId } = await params
  const supabase = await createClient()

  const { data: table } = await supabase.from('tables').select('*').eq('id', tableId).single()
  
  // Buscar comanda aberta para esta mesa
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(*, products(*))')
    .eq('table_id', tableId)
    .eq('status', 'aberta')
    .order('created_at', { ascending: false })
    .limit(1)

  const order = orders?.[0]

  const total = order?.order_items?.reduce((acc: number, item: any) => acc + (item.status !== 'cancelado' ? item.unit_price * item.quantity : 0), 0) || 0

  async function markDelivered(formData: FormData) {
    'use server'
    const itemIdsStr = formData.get('itemIds') as string
    const itemIds = itemIdsStr.split(',')
    const supabase = await createClient()
    await supabase.from('order_items').update({ status: 'entregue' }).in('id', itemIds)
    revalidatePath(`/garcom/mesas/${tableId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/garcom/mesas" className="flex items-center text-slate-400 hover:text-amber-500 transition-colors">
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

      <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-slate-300">Itens Lançados</h2>
          <span className="font-bold text-amber-500 text-lg">R$ {total.toFixed(2)}</span>
        </div>
        
        <div className="divide-y divide-slate-800/50">
          {!order || order.order_items?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhum item lançado nesta mesa.
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_15px_rgba(0,0,0,0.5)] md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:backdrop-blur-none z-40">
        <div className="max-w-lg mx-auto">
          <Link href={`/garcom/mesas/${tableId}/cardapio`}>
            <Button size="lg" className="w-full text-lg h-14 font-bold tracking-wide">
              <Plus className="w-6 h-6 mr-2" />
              LANÇAR PRODUTO
            </Button>
          </Link>
        </div>
      </div>
      {/* Spacer para não esconder conteúdo atrás do botão fixo no mobile */}
      <div className="h-24 md:hidden"></div>
    </div>
  )
}
