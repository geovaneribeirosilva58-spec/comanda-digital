'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Trash2 } from 'lucide-react'

interface ProductsClientProps {
  products: any[]
  updateProductFull: (formData: FormData) => Promise<void>
  toggleProductStatus: (id: string, currentActive: boolean) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export default function ProductsClient({ products, updateProductFull, toggleProductStatus, deleteProduct }: ProductsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-500" />
        <Input 
          type="text"
          placeholder="Buscar produto por nome ou categoria..."
          className="bg-transparent border-none text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-950 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">Categoria</th>
              <th className="px-6 py-4 font-medium">Preço</th>
              <th className="px-6 py-4 font-medium">Ativo</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredProducts.map((product) => {
              const isEditing = editingId === product.id
              
              if (isEditing) {
                return (
                  <tr key={product.id} className="bg-slate-800/80">
                    <td colSpan={5} className="p-0">
                      <form action={async (formData) => {
                        await updateProductFull(formData)
                        setEditingId(null)
                      }} className="flex items-center gap-4 px-6 py-4 w-full">
                        <input type="hidden" name="id" value={product.id} />
                        <Input name="name" defaultValue={product.name} className="flex-1 bg-slate-950 border-slate-700 font-bold text-amber-500 uppercase tracking-wider" required />
                        <Input name="category" defaultValue={product.category} className="w-48 bg-slate-950 border-slate-700 text-slate-300 uppercase" required />
                        <div className="flex items-center gap-2 w-32">
                          <span className="text-slate-400">R$</span>
                          <Input name="price" defaultValue={product.price} step="0.01" type="number" className="bg-slate-950 border-slate-700 flex-1" required />
                        </div>
                        <div className="w-16">
                          {product.active ? <span className="text-emerald-500 text-sm">Sim</span> : <span className="text-red-500 text-sm">Não</span>}
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
                <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">{product.name}</td>
                  <td className="px-6 py-4 text-slate-300">{product.category}</td>
                  <td className="px-6 py-4 font-bold text-amber-500">R$ {product.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    {product.active ? (
                      <span className="text-emerald-500">Sim</span>
                    ) : (
                      <span className="text-red-500">Não</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(product.id)} className="text-slate-400 hover:text-amber-500">
                      Editar
                    </Button>
                    <form action={() => toggleProductStatus(product.id, product.active)}>
                      <Button variant={product.active ? "destructive" : "secondary"} size="sm">
                        {product.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </form>
                    <form action={() => {
                      if(window.confirm('Tem certeza que deseja apagar este produto permanentemente?')) {
                        deleteProduct(product.id)
                      }
                    }}>
                      <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </td>
                </tr>
              )
            })}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
