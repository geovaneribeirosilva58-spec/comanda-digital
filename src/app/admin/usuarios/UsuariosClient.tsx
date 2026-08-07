'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface UsuariosClientProps {
  profiles: any[]
  deleteWaiter: (formData: FormData) => Promise<void>
  updateWaiter: (formData: FormData) => Promise<void>
}

export default function UsuariosClient({ profiles, deleteWaiter, updateWaiter }: UsuariosClientProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-slate-950 text-slate-400">
          <tr>
            <th className="px-6 py-4 font-medium">Nome</th>
            <th className="px-6 py-4 font-medium">E-mail</th>
            <th className="px-6 py-4 font-medium">Perfil</th>
            <th className="px-6 py-4 font-medium">Criado em</th>
            <th className="px-6 py-4 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {profiles.map((profile) => {
            const isEditing = editingId === profile.id

            if (isEditing) {
              return (
                <tr key={profile.id} className="bg-slate-800/80">
                  <td colSpan={5} className="p-0">
                    <form action={async (formData) => {
                      await updateWaiter(formData)
                      setEditingId(null)
                    }} className="flex items-center gap-4 px-6 py-4 w-full">
                      <input type="hidden" name="id" value={profile.id} />
                      <Input name="name" defaultValue={profile.name} className="w-48 bg-slate-950 border-slate-700 font-bold text-amber-500 uppercase tracking-wider" required />
                      <Input name="email" defaultValue={profile.email} type="email" className="w-48 bg-slate-950 border-slate-700 text-slate-300" required />
                      <Input name="password" type="password" placeholder="Nova Senha (Opcional)" minLength={6} className="w-48 bg-slate-950 border-slate-700 text-slate-300" />
                      <div className="w-20">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          profile.role === 'admin' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {profile.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-end ml-auto">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                        <Button type="submit" size="sm" variant="secondary" className="bg-amber-500 text-slate-950 hover:bg-amber-600">Salvar</Button>
                      </div>
                    </form>
                  </td>
                </tr>
              )
            }

            return (
              <tr key={profile.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">{profile.name}</td>
                <td className="px-6 py-4 text-slate-300">{profile.email}</td>
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
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(profile.id)} className="text-slate-400 hover:text-amber-500">
                    Editar
                  </Button>
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
            )
          })}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
