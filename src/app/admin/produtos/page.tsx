import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import ProductsClient from './ProductsClient'

export default async function AdminProdutosPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('category')
    .order('name')

  async function createProduct(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const category = (formData.get('category') as string).toUpperCase()
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr.replace(',', '.'))
    const description = (formData.get('description') as string)?.trim() || null
    const image_path = (formData.get('image_path') as string)?.trim() || null

    const supabase = await createClient()
    const { error } = await supabase.from('products').insert({
      name,
      category,
      price,
      description,
      image_path,
    })

    if (error) {
      throw new Error(error.message || 'Erro ao criar produto.')
    }

    revalidatePath('/admin/produtos')
  }

  async function toggleProductStatus(id: string, currentActive: boolean) {
    'use server'
    const supabase = await createClient()
    await supabase.from('products').update({ active: !currentActive }).eq('id', id)
    revalidatePath('/admin/produtos')
  }

  async function updateProductFull(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const category = (formData.get('category') as string).toUpperCase()
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr.replace(',', '.'))
    const description = (formData.get('description') as string)?.trim() || null
    const image_path = formData.get('image_path') !== null ? (formData.get('image_path') as string).trim() || null : undefined
    const old_image_path = (formData.get('old_image_path') as string)?.trim() || null
    const should_delete_old = formData.get('should_delete_old') === 'true'

    const supabase = await createClient()

    const updatePayload: Record<string, unknown> = { name, category, price, description }
    if (image_path !== undefined) {
      updatePayload.image_path = image_path
    }

    // 1. Atualiza no banco primeiro
    const { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message || 'Erro ao atualizar produto.')
    }

    // 2. Confirmação no banco: se havia foto anterior para limpar, deleta do storage
    if (should_delete_old && old_image_path) {
      await supabase.storage.from('products').remove([old_image_path])
    }

    revalidatePath('/admin/produtos')
  }

  async function deleteProduct(id: string) {
    'use server'
    const supabase = await createClient()

    // 1. Busca se o produto tinha imagem associada
    const { data: product } = await supabase
      .from('products')
      .select('image_path')
      .eq('id', id)
      .single()

    // 2. Deleta do banco primeiro (se falhar por FK constraint de pedidos, lança erro)
    const { error: dbError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (dbError) {
      throw new Error(dbError.message || 'Erro ao excluir produto.')
    }

    // 3. Sucesso no banco: remove imagem do Storage se existia
    if (product?.image_path) {
      await supabase.storage.from('products').remove([product.image_path])
    }

    revalidatePath('/admin/produtos')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-amber-500">Gerenciar Produtos</h1>
      </div>

      <ProductsClient 
        products={products || []} 
        createProduct={createProduct}
        updateProductFull={updateProductFull}
        toggleProductStatus={toggleProductStatus}
        deleteProduct={deleteProduct}
      />
    </div>
  )
}
