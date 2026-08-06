'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { openTableAndAddItems } from '../../../../garcom/actions'
import { useRouter } from 'next/navigation'
import { Minus, Plus, ShoppingCart, Send } from 'lucide-react'

export default function MenuClient({ tableId, categories }: { tableId: string, categories: any }) {
  const router = useRouter()
  const [cart, setCart] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddItem = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product_id: product.id, name: product.name, unit_price: product.price, quantity: 1, note: '' }]
    })
  }

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter((item) => item.product_id !== productId)
    })
  }

  const handleUpdateNote = (productId: string, note: string) => {
    setCart((prev) => prev.map((item) => item.product_id === productId ? { ...item, note } : item))
  }

  const handleSubmit = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    try {
      await openTableAndAddItems(tableId, cart)
      setCart([])
      router.push(`/admin/mesas/${tableId}`)
    } catch (error) {
      console.error(error)
      alert('Erro ao enviar pedido.')
      setIsSubmitting(false)
    }
  }

  const total = cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)

  return (
    <div className="pb-32 space-y-6">
      {/* Busca */}
      <Input 
        type="search" 
        placeholder="Buscar produto..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="text-lg py-6 bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500"
      />

      {/* Lista de Produtos */}
      <div className="space-y-8">
        {Object.entries(categories || {}).map(([category, products]: [string, any]) => {
          const filtered = products.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
          if (filtered.length === 0) return null

          return (
            <div key={category} className="space-y-3">
              <h2 className="text-xl font-bold border-b border-slate-800 pb-2 text-amber-500">{category}</h2>
              <div className="grid gap-3">
                {filtered.map((product: any) => {
                  const cartItem = cart.find(i => i.product_id === product.id)
                  return (
                    <div key={product.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-xl shadow-sm border border-slate-800">
                      <div>
                        <h3 className="font-semibold text-slate-200 text-lg">{product.name}</h3>
                        <p className="text-amber-500 font-bold">R$ {product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800">
                        {cartItem ? (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(product.id)} className="h-10 w-10 text-slate-400 hover:text-red-400 hover:bg-slate-900">
                              <Minus className="h-5 w-5" />
                            </Button>
                            <span className="w-8 text-center font-bold text-lg text-slate-200">{cartItem.quantity}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleAddItem(product)} className="h-10 w-10 text-slate-400 hover:text-amber-500 hover:bg-slate-900">
                              <Plus className="h-5 w-5" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" onClick={() => handleAddItem(product)} className="h-10 px-4 text-amber-500 hover:text-amber-400 hover:bg-slate-800 font-medium">
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Observações dos itens no carrinho */}
      {cart.length > 0 && (
        <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <h3 className="font-bold text-amber-500 mb-2">Observações</h3>
          {cart.map((item) => (
            <div key={item.product_id} className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-slate-300">{item.quantity}x {item.name}</label>
              <Input 
                placeholder="Ex: Sem cebola, gelo e limão..." 
                value={item.note}
                onChange={(e) => handleUpdateNote(item.product_id, e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          ))}
        </div>
      )}

      {/* Cart Summary Fixed Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-amber-500/20 shadow-[0_-10px_25px_rgba(245,158,11,0.1)] p-4 md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:mt-8 z-50">
          <div className="max-w-lg mx-auto flex justify-between items-center mb-3 md:hidden">
            <div className="flex items-center text-slate-300 font-medium">
              <ShoppingCart className="w-5 h-5 mr-2 text-amber-500" />
              {cart.reduce((acc, item) => acc + item.quantity, 0)} itens
            </div>
            <div className="text-xl font-bold text-amber-500">
              R$ {total.toFixed(2)}
            </div>
          </div>
          
          <div className="max-w-lg mx-auto">
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold tracking-wide"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  ENVIAR PEDIDO <span className="hidden md:inline ml-2"> (R$ {total.toFixed(2)})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
