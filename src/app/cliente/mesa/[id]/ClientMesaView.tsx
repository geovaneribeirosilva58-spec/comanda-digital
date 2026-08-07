'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { BellRing, CheckCircle2, Beer } from 'lucide-react'

export default function ClientMesaView({ table }: { table: any }) {
  const [loadingType, setLoadingType] = useState<string | null>(null)
  const [successType, setSuccessType] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleCallWaiter = async (type: 'garcom' | 'cerveja') => {
    if (cooldown > 0) return
    
    setLoadingType(type)
    
    try {
      const { error } = await supabase.from('table_calls').insert({
        table_id: table.id,
        status: 'pendente',
        call_type: type
      })

      if (error) throw error

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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-200">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-8 flex flex-col items-center text-center space-y-8">
        
        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] bg-black">
          <img src="/logo.jpg?v=2" alt="Guela Seca" className="w-full h-full object-cover" />
        </div>

        <div>
          <h1 className="text-3xl font-black text-amber-500 mb-2">Mesa {table.name}</h1>
          <p className="text-slate-400">Guela Seca Espetaria</p>
        </div>

        <div className="w-full pt-4 space-y-4">
          <Button 
            onClick={() => handleCallWaiter('cerveja')}
            disabled={loadingType !== null || cooldown > 0}
            className={`w-full h-20 text-lg font-bold rounded-2xl shadow-lg transition-all ${
              successType === 'cerveja' || (cooldown > 0 && successType === 'cerveja')
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/10' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
            } ${cooldown > 0 && successType !== 'cerveja' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {loadingType === 'cerveja' ? (
              'Enviando...'
            ) : successType === 'cerveja' || (cooldown > 0 && successType === 'cerveja') ? (
              <span className="flex items-center text-emerald-400">
                <CheckCircle2 className="w-8 h-8 mr-2" />
                Cerveja a Caminho! ({cooldown}s)
              </span>
            ) : (
              <span className="flex items-center text-2xl uppercase tracking-wider">
                <Beer className="w-8 h-8 mr-3" />
                Desce +1 Cerveja!
              </span>
            )}
          </Button>

          <Button 
            onClick={() => handleCallWaiter('garcom')}
            disabled={loadingType !== null || cooldown > 0}
            className={`w-full h-20 text-lg font-bold rounded-2xl shadow-lg transition-all ${
              successType === 'garcom' || (cooldown > 0 && successType === 'garcom')
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/50 hover:bg-amber-500/10' 
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
            } ${cooldown > 0 && successType !== 'garcom' ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {loadingType === 'garcom' ? (
              'Enviando...'
            ) : successType === 'garcom' || (cooldown > 0 && successType === 'garcom') ? (
              <span className="flex items-center text-amber-400">
                <CheckCircle2 className="w-8 h-8 mr-2" />
                Garçom a Caminho! ({cooldown}s)
              </span>
            ) : (
              <span className="flex items-center text-2xl uppercase tracking-wider">
                <BellRing className="w-8 h-8 mr-3" />
                Chamar Garçom
              </span>
            )}
          </Button>
        </div>
        
        <p className="text-xs text-slate-500 mt-8">
          Aperte uma das opções acima e um de nossos atendentes irá até sua mesa.
        </p>

      </div>
    </div>
  )
}
