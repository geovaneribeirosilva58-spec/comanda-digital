import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MenuClient from './MenuClient'

export const revalidate = 0

export default async function CardapioPage({ params }: { params: { id: string } }) {
  const { id: tableId } = await params
  const supabase = await createClient()

  // Buscar produtos ativos
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')

  // Agrupar produtos por categoria
  const categories = products?.reduce((acc: any, product) => {
    if (!acc[product.category]) {
      acc[product.category] = []
    }
    acc[product.category].push(product)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Link href={`/garcom/mesas/${tableId}`} className="flex items-center text-slate-400 hover:text-amber-500 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Voltar
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-amber-500">Cardápio</h1>

      <MenuClient tableId={tableId} categories={categories} />
    </div>
  )
}
