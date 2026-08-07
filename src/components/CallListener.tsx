'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { BellRing, X, CheckCircle, Beer } from 'lucide-react'

export function CallListener() {
  const [calls, setCalls] = useState<any[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Carregar chamados pendentes ao iniciar
    const fetchPendingCalls = async () => {
      const { data } = await supabase
        .from('table_calls')
        .select('id, table_id, created_at, call_type, tables(name)')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
      
      if (data) {
        setCalls(data)
      }
    }
    
    fetchPendingCalls()

    // Inscrever-se para novos chamados
    const subscription = supabase
      .channel('table_calls_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'table_calls',
          filter: 'status=eq.pendente'
        },
        async (payload) => {
          // Buscar o nome da mesa para o novo chamado
          const { data: tableData } = await supabase
            .from('tables')
            .select('name')
            .eq('id', payload.new.table_id)
            .single()

          const newCall = {
            ...payload.new,
            tables: { name: tableData?.name || 'Desconhecida' }
          }
          
          setCalls((prev) => [newCall, ...prev])
          playBell()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [supabase])

  const playBell = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(e => console.log('Autoplay bloqueado. O usuário precisa interagir com a tela primeiro.', e))
    }
  }

  // Loop de alarme: Toca a cada 30 segundos se houver chamados pendentes
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (calls.length > 0) {
      intervalId = setInterval(() => {
        playBell()
      }, 30000) // 30 segundos
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [calls.length])

  const handleResolve = async (id: string) => {
    // Atualiza o banco local e visualmente instantaneamente
    setCalls(prev => prev.filter(c => c.id !== id))
    
    await supabase
      .from('table_calls')
      .update({ status: 'resolvido' })
      .eq('id', id)
  }

  if (calls.length === 0) return (
    <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
  )

  return (
    <>
      <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
      
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 max-w-sm w-full">
        {calls.map((call) => {
          const isBeer = call.call_type === 'cerveja'
          return (
            <div key={call.id} className={`bg-slate-900 border ${isBeer ? 'border-emerald-500 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)]' : 'border-amber-500 shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)]'} rounded-xl p-4 relative overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300`}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${isBeer ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
              
              <div className="pl-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${isBeer ? 'bg-emerald-500/20' : 'bg-amber-500/20'} p-2 rounded-lg`}>
                      {isBeer ? (
                        <Beer className="w-6 h-6 text-emerald-500 animate-[wiggle_1s_ease-in-out_infinite]" />
                      ) : (
                        <BellRing className="w-6 h-6 text-amber-500 animate-[wiggle_1s_ease-in-out_infinite]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">
                        {isBeer ? `Mesa ${call.tables?.name} pediu Cerveja!` : `Mesa ${call.tables?.name} chamando!`}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {new Date(call.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleResolve(call.id)}
                    className="text-slate-500 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleResolve(call.id)}
                    className={`flex-1 ${isBeer ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'} text-slate-950 font-bold py-2 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Marcar como Atendido
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
