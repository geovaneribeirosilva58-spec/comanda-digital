import { getPublicProductImageUrl } from './product-image-service'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseQueryClient = any

export interface MenuItem {
  id: string
  name: string
  category: string
  price: number
  description?: string | null
  imagePath?: string | null
  imageUrl: string | null
  hasImage: boolean
}

export interface MenuData {
  categories: Record<string, MenuItem[]>
}

/**
 * Busca todos os produtos ativos do banco e os formata agrupados por categoria
 * garantindo a resolução correta das URLs do CDN do Supabase.
 */
export async function getActiveProductsForMenu(
  supabase: SupabaseQueryClient,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
): Promise<MenuData> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')

  if (error) {
    throw new Error(error.message || 'Erro ao consultar produtos ativos do cardápio.')
  }

  const categories: Record<string, MenuItem[]> = {}

  for (const product of products || []) {
    const categoryName = String(product.category || 'OUTROS').toUpperCase()
    if (!categories[categoryName]) {
      categories[categoryName] = []
    }

    const imagePath = typeof product.image_path === 'string' ? product.image_path : null
    const imageUrl = getPublicProductImageUrl(imagePath, supabaseUrl)

    categories[categoryName].push({
      id: String(product.id),
      name: String(product.name),
      category: categoryName,
      price: Number(product.price),
      description: typeof product.description === 'string' ? product.description : null,
      imagePath,
      imageUrl,
      hasImage: Boolean(imageUrl),
    })
  }

  return { categories }
}
