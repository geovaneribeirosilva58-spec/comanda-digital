/* eslint-disable @next/next/no-img-element */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BellRing, CheckCircle2, Beer, UtensilsCrossed } from 'lucide-react'
import { callWaiter } from '../../actions'
import type { MenuItem } from '@/lib/menu-service'

interface ClientMesaViewProps {
  table: {
    id: string
    name: string
  }
  categories?: Record<string, MenuItem[]>
}

export default function ClientMesaView({ table, categories = {} }: ClientMesaViewProps) {
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const [successType, setSuccessType] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const handleCallWaiter = async (type: 'garcom' | 'cerveja') => {
    if (cooldown > 0) return

    setLoadingType(type)

    try {
      await callWaiter(table.id, type)
      setSuccessType(type)

      // Cooldown de 60 segundos
      setCooldown(60)
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setSuccessType(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error(err)
      alert('Erro ao enviar o pedido. Tente novamente.')
    } finally {
      setLoadingType(null)
    }
  }

  const categoryNames = Object.keys(categories)

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 sm:p-6 text-slate-200">
      <div className="w-full max-w-md flex flex-col items-center space-y-6">
        {/* Card Principal da Mesa e Ações Rápidas */}
        <div className="w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-6 sm:p-8 flex flex-col items-center text-center space-y-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-black">
            <img
              src="/logo.jpg?v=2"
              alt="Guela Seca"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-3xl font-black text-amber-500 mb-1">Mesa {table.name}</h1>
            <p className="text-slate-400 text-sm">Guela Seca Espetaria</p>
          </div>

          <div className="w-full space-y-3">
            <Button
              onClick={() => handleCallWaiter('cerveja')}
              disabled={loadingType !== null || cooldown > 0}
              className={`w-full h-16 text-base sm:text-lg font-bold rounded-2xl shadow-lg transition-all ${
                successType === 'cerveja' || (cooldown > 0 && successType === 'cerveja')
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
              } ${cooldown > 0 && successType !== 'cerveja' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {loadingType === 'cerveja' ? (
                'Enviando...'
              ) : successType === 'cerveja' || (cooldown > 0 && successType === 'cerveja') ? (
                <span className="flex items-center text-emerald-400 font-bold">
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Cerveja a Caminho! ({cooldown}s)
                </span>
              ) : (
                <span className="flex items-center text-xl uppercase tracking-wider">
                  <Beer className="w-6 h-6 mr-2.5" />
                  Desce +1 Cerveja!
                </span>
              )}
            </Button>

            <Button
              onClick={() => handleCallWaiter('garcom')}
              disabled={loadingType !== null || cooldown > 0}
              className={`w-full h-16 text-base sm:text-lg font-bold rounded-2xl shadow-lg transition-all ${
                successType === 'garcom' || (cooldown > 0 && successType === 'garcom')
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/50 hover:bg-amber-500/10'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
              } ${cooldown > 0 && successType !== 'garcom' ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {loadingType === 'garcom' ? (
                'Enviando...'
              ) : successType === 'garcom' || (cooldown > 0 && successType === 'garcom') ? (
                <span className="flex items-center text-amber-400 font-bold">
                  <CheckCircle2 className="w-6 h-6 mr-2" />
                  Garçom a Caminho! ({cooldown}s)
                </span>
              ) : (
                <span className="flex items-center text-xl uppercase tracking-wider">
                  <BellRing className="w-6 h-6 mr-2.5" />
                  Chamar Garçom
                </span>
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            Toque nos botões acima para avisar nossa equipe em tempo real.
          </p>
        </div>

        {/* Seção do Cardápio Digital Consultivo */}
        <div className="w-full space-y-6 pt-2 pb-12">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Cardápio</h2>
              <p className="text-xs text-slate-400">Consulte nossos produtos e valores</p>
            </div>
          </div>

          {categoryNames.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
              Nenhum produto cadastrado no momento.
            </div>
          ) : (
            categoryNames.map((category) => {
              const items = categories[category] || []
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-500 tracking-widest uppercase bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      {category}
                    </span>
                    <div className="flex-1 h-px bg-slate-800/80" />
                  </div>

                  <div className="space-y-2.5">
                    {items.map((product) => (
                      <div
                        key={product.id}
                        className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3 flex items-center gap-3.5 transition-all shadow-sm"
                      >
                        {/* Espaço reservado para foto com proporção padrão Tailwind */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800/80 shrink-0 aspect-square flex items-center justify-center border border-slate-700/40">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-slate-600 flex flex-col items-center justify-center" title="Sem foto">
                              <UtensilsCrossed className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Nome, Descrição e Preço */}
                        <div className="flex-1 min-w-0 pr-1">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight uppercase tracking-wide">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                          <div className="text-amber-500 font-extrabold text-sm sm:text-base mt-1.5">
                            R$ {product.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
