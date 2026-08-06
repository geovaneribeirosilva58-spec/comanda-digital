import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProductsClient from './ProductsClient'

export default async function AdminProdutosPage() {
  const supabase = await createClient()
  const { data: products } = await supabase.from('products').select('*').order('category').order('name')

  async function createProduct(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const category = formData.get('category') as string
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr.replace(',', '.'))

    const supabase = await createClient()
    await supabase.from('products').insert({ name, category, price })
    revalidatePath('/admin/produtos')
  }

  async function toggleProductStatus(id: string, currentActive: boolean) {
    'use server'
    const supabase = await createClient()
    await supabase.from('products').update({ active: !currentActive }).eq('id', id)
    revalidatePath('/admin/produtos')
  }

  async function updateProductPrice(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr.replace(',', '.'))
    const supabase = await createClient()
    await supabase.from('products').update({ price }).eq('id', id)
    revalidatePath('/admin/produtos')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-500">Gerenciar Produtos</h1>
      </div>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
        <h2 className="text-lg font-semibold mb-4 text-slate-300">Novo Produto</h2>
        <form action={createProduct} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 mb-1 block">Nome</label>
            <Input name="name" placeholder="Ex: Cerveja IPA 600ml" required />
          </div>
          <div className="w-48">
            <label className="text-sm text-slate-400 mb-1 block">Categoria</label>
            <Input name="category" placeholder="Ex: Bebidas" required />
          </div>
          <div className="w-32">
            <label className="text-sm text-slate-400 mb-1 block">Preço (R$)</label>
            <Input name="price" placeholder="25,90" step="0.01" type="number" required />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      </div>

      <ProductsClient 
        products={products || []} 
        updateProductPrice={updateProductPrice}
        toggleProductStatus={toggleProductStatus}
      />
    </div>
  )
}
