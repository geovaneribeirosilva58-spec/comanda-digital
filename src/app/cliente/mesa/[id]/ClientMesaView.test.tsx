import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ClientMesaView from './ClientMesaView'
import * as actions from '../../actions'

vi.mock('../../actions', () => ({
  callWaiter: vi.fn().mockResolvedValue({ success: true }),
}))

describe('ClientMesaView Component Integration', () => {
  const mockTable = { id: 'table-123', name: '05' }

  const mockCategories = {
    ESPETOS: [
      {
        id: '1',
        name: 'Espeto de Picanha',
        category: 'ESPETOS',
        price: 22.5,
        description: 'Carne nobre com farofa',
        imagePath: 'items/picanha.webp',
        imageUrl: 'https://test.supabase.co/storage/v1/object/public/products/items/picanha.webp',
        hasImage: true,
      },
      {
        id: '2',
        name: 'Queijo Coalho',
        category: 'ESPETOS',
        price: 12.0,
        description: null,
        imagePath: null,
        imageUrl: null,
        hasImage: false,
      },
    ],
    BEBIDAS: [
      {
        id: '3',
        name: 'Cerveja Original 600ml',
        category: 'BEBIDAS',
        price: 16.0,
        description: 'Super gelada',
        imagePath: 'items/original.webp',
        imageUrl: 'https://test.supabase.co/storage/v1/object/public/products/items/original.webp',
        hasImage: true,
      },
    ],
  }

  it('deve renderizar o título da mesa e categorias do cardápio', () => {
    render(<ClientMesaView table={mockTable} categories={mockCategories} />)

    expect(screen.getByText('Mesa 05')).toBeDefined()
    expect(screen.getByText('ESPETOS')).toBeDefined()
    expect(screen.getByText('BEBIDAS')).toBeDefined()

    expect(screen.getByText('Espeto de Picanha')).toBeDefined()
    expect(screen.getByText('Carne nobre com farofa')).toBeDefined()
    expect(screen.getByText('R$ 22.50')).toBeDefined()

    expect(screen.getByText('Queijo Coalho')).toBeDefined()
    expect(screen.getByText('R$ 12.00')).toBeDefined()
  })

  it('deve renderizar a tag <img> com loading="lazy", decoding="async" e classes padrão Tailwind para produto com foto', () => {
    render(<ClientMesaView table={mockTable} categories={mockCategories} />)

    const picanhaImg = screen.getByAltText('Espeto de Picanha') as HTMLImageElement
    expect(picanhaImg).toBeDefined()
    expect(picanhaImg.src).toBe('https://test.supabase.co/storage/v1/object/public/products/items/picanha.webp')
    expect(picanhaImg.getAttribute('loading')).toBe('lazy')
    expect(picanhaImg.getAttribute('decoding')).toBe('async')

    // Verifica que o contêiner possui as classes padrão Tailwind
    const container = picanhaImg.closest('.w-20')
    expect(container).not.toBeNull()
    expect(container?.className).toContain('w-20')
    expect(container?.className).toContain('h-20')
    expect(container?.className).toContain('rounded-xl')
    expect(container?.className).toContain('aspect-square')
  })

  it('deve renderizar placeholder com espaço reservado para produto sem foto', () => {
    render(<ClientMesaView table={mockTable} categories={mockCategories} />)

    // Queijo Coalho não tem alt text de img porque usa placeholder
    expect(screen.queryByAltText('Queijo Coalho')).toBeNull()

    const placeholderTitle = screen.getByTitle('Sem foto')
    expect(placeholderTitle).toBeDefined()
    const container = placeholderTitle.closest('.w-20')
    expect(container?.className).toContain('w-20')
    expect(container?.className).toContain('h-20')
  })

  it('deve manter os botões de ação rápida funcionais (Desce +1 Cerveja! e Chamar Garçom)', async () => {
    render(<ClientMesaView table={mockTable} categories={mockCategories} />)

    const beerBtn = screen.getByRole('button', { name: /Desce \+1 Cerveja!/i })
    const waiterBtn = screen.getByRole('button', { name: /Chamar Garçom/i })

    expect(beerBtn).toBeDefined()
    expect(waiterBtn).toBeDefined()

    await act(async () => {
      fireEvent.click(beerBtn)
    })
    expect(actions.callWaiter).toHaveBeenCalledWith('table-123', 'cerveja')
  })
})
