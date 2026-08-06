import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Beer } from 'lucide-react'

export const revalidate = 0

export default async function GarcomMesasPage() {
  const supabase = await createClient()
  
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-500">Selecione uma Mesa</h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {tables?.map((table) => {
          const isLivre = table.status === 'livre'
          return (
            <Link 
              href={`/garcom/mesas/${table.id}`} 
              key={table.id}
            >
              <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all active:scale-95 ${
                isLivre 
                  ? 'border-slate-800 bg-slate-900 hover:border-amber-500/50 text-slate-300' 
                  : 'border-amber-500 bg-amber-500/10 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
              }`}>
                <Beer className={`w-8 h-8 mb-2 ${isLivre ? 'text-slate-500' : 'text-amber-500'}`} />
                <span className="font-bold text-xl">{table.name}</span>
                <span className={`text-xs mt-1 font-medium ${isLivre ? 'text-slate-500' : 'text-amber-400'}`}>
                  {isLivre ? 'Livre' : 'Ocupada'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      
      {tables?.length === 0 && (
        <div className="text-center p-8 text-slate-500">
          Nenhuma mesa cadastrada ou ativa.
        </div>
      )}
    </div>
  )
}
