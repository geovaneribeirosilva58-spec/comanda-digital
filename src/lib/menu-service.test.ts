import { describe, it, expect, vi } from 'vitest'
import { getActiveProductsForMenu, type SupabaseQueryClient } from './menu-service'

describe('Seam 3: getActiveProductsForMenu', () => {
  it('deve consultar estritamente com filtro active = true e ordenado por categoria e nome', async () => {
    const mockOrderName = vi.fn().mockResolvedValue({
      data: [
        { id: '1', name: 'Alcatra', category: 'ESPETOS', price: 12.0, active: true, image_path: 'items/alcatra.webp' },
        { id: '2', name: 'Frango', category: 'ESPETOS', price: 10.0, active: true, image_path: null },
        { id: '3', name: 'Cerveja IPA', category: 'BEBIDAS', price: 18.0, active: true, image_path: 'items/ipa.webp', description: '600ml artesanal' },
      ],
      error: null,
    })
    const mockOrderCategory = vi.fn().mockReturnValue({ order: mockOrderName })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrderCategory })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    const mockSupabase: SupabaseQueryClient = {
      from: mockFrom,
    }

    const result = await getActiveProductsForMenu(mockSupabase, 'https://test-project.supabase.co')

    // 1. Comprova que chamou a tabela products
    expect(mockFrom).toHaveBeenCalledWith('products')
    // 2. Comprova que o filtro estrito active = true foi aplicado
    expect(mockEq).toHaveBeenCalledWith('active', true)
    // 3. Comprova ordenação
    expect(mockOrderCategory).toHaveBeenCalledWith('category')
    expect(mockOrderName).toHaveBeenCalledWith('name')

    // 4. Comprova agrupamento e resolução das URLs do CDN
    expect(Object.keys(result.categories)).toEqual(['ESPETOS', 'BEBIDAS'])

    const espetos = result.categories['ESPETOS']
    expect(espetos).toHaveLength(2)
    expect(espetos[0].name).toBe('Alcatra')
    expect(espetos[0].imageUrl).toBe('https://test-project.supabase.co/storage/v1/object/public/products/items/alcatra.webp')
    expect(espetos[0].hasImage).toBe(true)

    expect(espetos[1].name).toBe('Frango')
    expect(espetos[1].imageUrl).toBeNull()
    expect(espetos[1].hasImage).toBe(false)

    const bebidas = result.categories['BEBIDAS']
    expect(bebidas[0].name).toBe('Cerveja IPA')
    expect(bebidas[0].description).toBe('600ml artesanal')
    expect(bebidas[0].imageUrl).toBe('https://test-project.supabase.co/storage/v1/object/public/products/items/ipa.webp')
  })

  it('deve propagar erro caso a query no Supabase falhe', async () => {
    const mockOrderName = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Erro ao consultar banco de dados' },
    })
    const mockOrderCategory = vi.fn().mockReturnValue({ order: mockOrderName })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrderCategory })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    const mockSupabase: SupabaseQueryClient = {
      from: mockFrom,
    }

    await expect(
      getActiveProductsForMenu(mockSupabase)
    ).rejects.toThrow('Erro ao consultar banco de dados')
  })
})
