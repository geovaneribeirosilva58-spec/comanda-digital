import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })

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

      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-950 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">Perfil</th>
              <th className="px-6 py-4 font-medium">Criado em</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {profiles?.map((profile) => (
              <tr key={profile.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">{profile.name}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    profile.role === 'admin' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {profile.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-right">
                  {profile.role === 'garcom' && (
                    <form action={deleteWaiter}>
                      <input type="hidden" name="id" value={profile.id} />
                      <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20">
                        Excluir
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
