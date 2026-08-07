'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Edit2, Check, X, Trash2 } from 'lucide-react'

type Table = {
  id: string
  name: string
  status: string
  active: boolean
}

interface TablesClientProps {
  initialTables: Table[]
  onToggleStatus: (id: string, currentActive: boolean) => Promise<void>
  onEditTable: (id: string, newName: string) => Promise<void>
  onDeleteTable: (id: string) => Promise<void>
}

export function TablesClient({ initialTables, onToggleStatus, onEditTable, onDeleteTable }: TablesClientProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleEditClick = (table: Table) => {
    setEditingId(table.id)
    setEditName(table.name)
  }

  const handleSave = async (id: string) => {
    if (editName.trim()) {
      await onEditTable(id, editName.trim())
    }
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditName('')
  }

  return (
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
          {initialTables?.map((table) => (
            <tr key={table.id} className="hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">
                {editingId === table.id ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      className="max-w-[200px] h-8 text-sm"
                      autoFocus
                    />
                    <Button size="sm" variant="default" onClick={() => handleSave(table.id)} className="h-8 px-2 bg-emerald-500 hover:bg-emerald-600">
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleCancel} className="h-8 px-2">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {table.name}
                    <button onClick={() => handleEditClick(table)} className="text-slate-500 hover:text-amber-500 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </td>
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
                  <Button variant={table.active ? "destructive" : "secondary"} size="sm" onClick={() => onToggleStatus(table.id, table.active)}>
                    {table.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  {table.status === 'livre' && (
                    <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20" onClick={() => {
                      if(window.confirm('Tem certeza que deseja apagar esta mesa permanentemente?')) {
                        onDeleteTable(table.id);
                      }
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {initialTables?.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                Nenhuma mesa cadastrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
