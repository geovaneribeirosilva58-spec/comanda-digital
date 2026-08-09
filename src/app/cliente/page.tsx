import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

export const revalidate = 0

export default async function ClienteHomePage() {
  // Bypass RLS using service_role_key in Server Component
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar mesas ativas ordenadas por nome
  const { data: tables } = await supabase
    .from('tables')
    .select('id, name, status')
    .eq('active', true)
    .order('name')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
            <UtensilsCrossed className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-4xl font-black text-amber-500 tracking-tight">Bem-vindo!</h1>
          <p className="text-slate-400 text-lg">
            Por favor, selecione o número da sua mesa para acessar sua comanda.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          {tables?.map((table) => (
            <Link 
              key={table.id} 
              href={`/cliente/mesa/${table.id}`}
              className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl flex flex-col items-center justify-center transition-all hover:bg-slate-800/80 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]"
            >
              <span className="text-3xl font-black text-slate-200 group-hover:text-amber-500 transition-colors">
                {table.name}
              </span>
              <span className="text-xs font-medium text-slate-500 mt-2 uppercase tracking-widest">
                Mesa
              </span>
              
              {/* Indicador sutil se a mesa está em uso (opcional, mas bom pra UX) */}
              {table.status === 'aberta' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Mesa em uso" />
              )}
            </Link>
          ))}

          {(!tables || tables.length === 0) && (
            <div className="col-span-2 text-center p-8 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
              Nenhuma mesa disponível no momento.
            </div>
          )}
        </div>
        
      </div>
    </div>
  )
}
