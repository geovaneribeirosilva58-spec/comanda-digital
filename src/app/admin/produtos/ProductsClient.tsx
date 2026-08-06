'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface ProductsClientProps {
  products: any[]
  updateProductPrice: (formData: FormData) => Promise<void>
  toggleProductStatus: (id: string, currentActive: boolean) => Promise<void>
}

export default function ProductsClient({ products, updateProductPrice, toggleProductStatus }: ProductsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')

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
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-lg font-bold text-amber-500 uppercase tracking-wider">{product.name}</td>
                <td className="px-6 py-4 text-slate-300">{product.category}</td>
                <td className="px-6 py-4 font-bold text-amber-500">
                  <form action={updateProductPrice} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={product.id} />
                    <span className="text-slate-400">R$</span>
                    <Input name="price" defaultValue={product.price} step="0.01" type="number" className="w-24 h-8 bg-slate-950 border-slate-700" required />
                    <Button type="submit" size="sm" variant="secondary" className="h-8 px-2 text-xs">Salvar</Button>
                  </form>
                </td>
                <td className="px-6 py-4">
                  {product.active ? (
                    <span className="text-emerald-500">Sim</span>
                  ) : (
                    <span className="text-red-500">Não</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {/* Note that we need to bind arguments via an inline arrow function or just passing them to a hidden input, or since it's a Client Component, we can't easily use .bind(null). 
                      Instead we can wrap it in an action function */}
                  <form action={() => toggleProductStatus(product.id, product.active)}>
                    <Button variant={product.active ? "destructive" : "secondary"} size="sm">
                      {product.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
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
