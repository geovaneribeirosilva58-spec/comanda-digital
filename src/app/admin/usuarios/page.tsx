import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import UsuariosClient from './UsuariosClient'

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const adminAuth = createAdminClient()

  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  const { data: authUsers } = await adminAuth.auth.admin.listUsers()

  const combinedProfiles = profiles?.map(profile => {
    const authUser = authUsers?.users.find(u => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email || ''
    }
  }) || []

  async function createWaiter(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const adminAuth = createAdminClient()
    
    const { data, error } = await adminAuth.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: name,
        role: 'garcom'
      }
    })

    if (error) {
      console.error('Erro ao criar usuário:', error)
    }

    revalidatePath('/admin/usuarios')
  }

  async function deleteWaiter(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    
    // Deletar o usuario do Auth (Admin)
    const adminAuth = createAdminClient()
    await adminAuth.auth.admin.deleteUser(id)
    
    // Deletar da tabela profiles
    const supabase = await createClient()
    await supabase.from('profiles').delete().eq('id', id)
    
    revalidatePath('/admin/usuarios')
  }

  async function updateWaiter(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    const adminAuth = createAdminClient()
    const updatePayload: any = {
      email,
      user_metadata: { name }
    }
    
    if (password && password.trim().length >= 6) {
      updatePayload.password = password
    }

    // Update in Auth
    await adminAuth.auth.admin.updateUserById(id, updatePayload)
    
    // Update in profiles table
    const supabase = await createClient()
    await supabase.from('profiles').update({ name }).eq('id', id)
    
    revalidatePath('/admin/usuarios')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-500">Gerenciar Garçons</h1>
      </div>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
        <h2 className="text-lg font-semibold mb-4 text-slate-300">Novo Garçom</h2>
        <form action={createWaiter} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 mb-1 block">Nome</label>
            <Input name="name" placeholder="Nome do garçom" required />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 mb-1 block">E-mail</label>
            <Input name="email" type="email" placeholder="E-mail de acesso" required />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 mb-1 block">Senha (Mín. 6)</label>
            <Input name="password" type="password" minLength={6} placeholder="Senha de acesso" required />
          </div>
          <Button type="submit">Cadastrar</Button>
        </form>
      </div>

      <UsuariosClient 
        profiles={combinedProfiles}
        deleteWaiter={deleteWaiter}
        updateWaiter={updateWaiter}
      />
    </div>
  )
}
