import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default async function AdminMesasPage() {
  const supabase = await createClient()
  const { data: tables } = await supabase.from('tables').select('*').order('name')

  async function createTable(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const supabase = await createClient()
    await supabase.from('tables').insert({ name })
    revalidatePath('/admin/mesas')
  }

  async function toggleTableStatus(id: string, currentActive: boolean) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tables').update({ active: !currentActive }).eq('id', id)
    revalidatePath('/admin/mesas')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-500">Gerenciar Mesas</h1>
      </div>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
        <h2 className="text-lg font-semibold mb-4 text-slate-300">Nova Mesa</h2>
        <form action={createTable} className="flex gap-4">
          <Input name="name" placeholder="Nome da mesa (ex: Mesa 01)" required className="max-w-xs" />
          <Button type="submit">Adicionar Mesa</Button>
        </form>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-950 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">Status da Comanda</th>
              <th className="px-6 py-4 font-medium">Ativa no Sistema</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tables?.map((table) => (
              <tr key={table.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">{table.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    table.status === 'livre' ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                  }`}>
                    {table.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {table.active ? (
                    <span className="text-emerald-500">Sim</span>
                  ) : (
                    <span className="text-red-500">Não</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/mesas/${table.id}`}>
                      <Button variant="default" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                        {table.status === 'livre' ? 'Abrir Comanda' : 'Ver Comanda'}
                      </Button>
                    </Link>
                    <form action={toggleTableStatus.bind(null, table.id, table.active)}>
                      <Button variant={table.active ? "destructive" : "secondary"} size="sm">
                        {table.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {tables?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Nenhuma mesa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
