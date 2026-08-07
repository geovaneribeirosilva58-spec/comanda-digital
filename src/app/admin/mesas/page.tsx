import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TablesClient } from './TablesClient'

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

  async function editTable(id: string, newName: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tables').update({ name: newName }).eq('id', id)
    revalidatePath('/admin/mesas')
  }

  async function deleteTable(id: string) {
    'use server'
    const supabase = await createClient()
    await supabase.from('tables').delete().eq('id', id)
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

      <TablesClient 
        initialTables={tables || []} 
        onToggleStatus={toggleTableStatus} 
        onEditTable={editTable} 
        onDeleteTable={deleteTable} 
      />
    </div>
  )
}
