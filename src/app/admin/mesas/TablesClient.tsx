'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Edit2, Check, X, Trash2, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

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
  const [qrTableId, setQrTableId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEditClick = (table: Table) => {
    setEditingId(table.id)
    setEditName(table.name)
  }

  const handleSave = async (id: string) => {
    if (editName.trim()) {
      startTransition(async () => {
        await onEditTable(id, editName.trim())
      })
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
                      Acessar Comanda
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => setQrTableId(table.id)} className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                    <QrCode className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    disabled={isPending}
                    onClick={() => startTransition(() => onToggleStatus(table.id, table.active))}
                    className="w-24 text-slate-300 border border-slate-700 hover:bg-slate-800"
                  >
                    {table.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      if(confirm('Tem certeza que deseja apagar essa mesa? Todas as comandas vinculadas a ela serão perdidas.')) {
                        startTransition(async () => {
                          try {
                            await onDeleteTable(table.id)
                          } catch (err: any) {
                            alert('Erro ao apagar mesa: ' + err.message)
                          }
                        })
                      }
                    }}
                    className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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

      {/* QR Code Modal */}
      {qrTableId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center relative">
            <button onClick={() => setQrTableId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-amber-500 mb-6">QR Code da Mesa</h3>
            <div className="bg-white p-4 rounded-xl mb-6">
              <QRCodeCanvas 
                value={`${window.location.origin}/cliente/mesa/${qrTableId}`} 
                size={200}
                bgColor={"#ffffff"}
                fgColor={"#000000"}
                level={"H"}
                includeMargin={false}
              />
            </div>
            <p className="text-center text-sm text-slate-400 mb-4 font-bold">
              Aponte a câmera do seu Smartphone e leia o QR-code para Chamar o Garçom
            </p>
            <Button onClick={() => window.print()} className="w-full font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
              Imprimir QR Code
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
