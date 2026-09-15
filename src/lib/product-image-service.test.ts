import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createProductWithImage,
  updateProductWithImage,
  deleteProductWithImage,
  type StorageClientAdapter,
  type DatabaseClientAdapter,
} from './product-image-service'

describe('Seam 2: product-image-service (Transações Compensatórias e Ordem Segura)', () => {
  let mockStorage: StorageClientAdapter
  let mockDb: DatabaseClientAdapter

  beforeEach(() => {
    mockStorage = {
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }
    mockDb = {
      insertProduct: vi.fn().mockResolvedValue({ id: 'prod-1', error: null }),
      updateProduct: vi.fn().mockResolvedValue({ error: null }),
      deleteProduct: vi.fn().mockResolvedValue({ error: null }),
    }
  })

  describe('Criação com Imagem', () => {
    it('deve fazer upload e salvar produto com image_path', async () => {
      const blob = new Blob(['data'], { type: 'image/webp' })
      const result = await createProductWithImage(
        { name: 'Espeto de Carne', category: 'ESPETOS', price: 15.0, description: 'Carne macia' },
        blob,
        { storage: mockStorage, db: mockDb }
      )

      expect(mockStorage.upload).toHaveBeenCalledTimes(1)
      const uploadMock = mockStorage.upload as unknown as { mock: { calls: string[][] } }
      const uploadedPath = uploadMock.mock.calls[0][0]
      expect(uploadedPath).toMatch(/^items\/[a-f0-9-]+\.webp$/)

      expect(mockDb.insertProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Espeto de Carne',
          image_path: uploadedPath,
        })
      )
      expect(mockStorage.remove).not.toHaveBeenCalled()
      expect(result.id).toBe('prod-1')
    })

    it('deve compensar e remover imagem do storage se o banco de dados falhar ao inserir', async () => {
      const blob = new Blob(['data'], { type: 'image/webp' })
      mockDb.insertProduct = vi.fn().mockRejectedValue(new Error('Erro de conexão com o banco'))

      await expect(
        createProductWithImage(
          { name: 'Espeto', category: 'ESPETOS', price: 15.0 },
          blob,
          { storage: mockStorage, db: mockDb }
        )
      ).rejects.toThrow('Erro de conexão com o banco')

      expect(mockStorage.upload).toHaveBeenCalledTimes(1)
      const uploadMock = mockStorage.upload as unknown as { mock: { calls: string[][] } }
      const uploadedPath = uploadMock.mock.calls[0][0]

      // Compensação obrigatória: apagou o arquivo órfão
      expect(mockStorage.remove).toHaveBeenCalledWith([uploadedPath])
    })
  })

  describe('Substituição de Imagem', () => {
    it('deve enviar nova imagem, atualizar banco e somente então apagar a antiga', async () => {
      const newBlob = new Blob(['new-data'], { type: 'image/webp' })
      const executionOrder: string[] = []

      mockStorage.upload = vi.fn().mockImplementation(async () => {
        executionOrder.push('upload_novo')
        return { error: null }
      })
      mockDb.updateProduct = vi.fn().mockImplementation(async () => {
        executionOrder.push('update_banco')
        return { error: null }
      })
      mockStorage.remove = vi.fn().mockImplementation(async () => {
        executionOrder.push('delete_antigo')
        return { error: null }
      })

      await updateProductWithImage(
        'prod-1',
        { name: 'Espeto', category: 'ESPETOS', price: 15.0 },
        {
          currentImagePath: 'items/antigo.webp',
          newImageBlob: newBlob,
          shouldRemoveImage: false,
        },
        { storage: mockStorage, db: mockDb }
      )

      expect(executionOrder).toEqual(['upload_novo', 'update_banco', 'delete_antigo'])
      expect(mockStorage.remove).toHaveBeenCalledWith(['items/antigo.webp'])
    })

    it('deve compensar removendo a imagem nova e mantendo a antiga se o banco falhar no update', async () => {
      const newBlob = new Blob(['new-data'], { type: 'image/webp' })
      mockDb.updateProduct = vi.fn().mockRejectedValue(new Error('Falha ao atualizar linha'))

      await expect(
        updateProductWithImage(
          'prod-1',
          { name: 'Espeto', category: 'ESPETOS', price: 15.0 },
          {
            currentImagePath: 'items/antigo.webp',
            newImageBlob: newBlob,
            shouldRemoveImage: false,
          },
          { storage: mockStorage, db: mockDb }
        )
      ).rejects.toThrow('Falha ao atualizar linha')

      const uploadMock = mockStorage.upload as unknown as { mock: { calls: string[][] } }
      const newUploadedPath = uploadMock.mock.calls[0][0]

      // Compensação: apagou a imagem nova recém-enviada
      expect(mockStorage.remove).toHaveBeenCalledWith([newUploadedPath])
      // A imagem antiga NUNCA deve ter sido apagada
      expect(mockStorage.remove).not.toHaveBeenCalledWith(['items/antigo.webp'])
    })
  })

  describe('Remoção de Imagem e Exclusão de Produto', () => {
    it('deve atualizar banco primeiro e só depois deletar imagem do storage na remoção de foto', async () => {
      const executionOrder: string[] = []
      mockDb.updateProduct = vi.fn().mockImplementation(async () => {
        executionOrder.push('update_banco_null')
        return { error: null }
      })
      mockStorage.remove = vi.fn().mockImplementation(async () => {
        executionOrder.push('delete_storage')
        return { error: null }
      })

      await updateProductWithImage(
        'prod-1',
        { name: 'Espeto', category: 'ESPETOS', price: 15.0 },
        {
          currentImagePath: 'items/foto-para-remover.webp',
          newImageBlob: null,
          shouldRemoveImage: true,
        },
        { storage: mockStorage, db: mockDb }
      )

      expect(executionOrder).toEqual(['update_banco_null', 'delete_storage'])
      expect(mockDb.updateProduct).toHaveBeenCalledWith(
        'prod-1',
        expect.objectContaining({ image_path: null })
      )
      expect(mockStorage.remove).toHaveBeenCalledWith(['items/foto-para-remover.webp'])
    })

    it('NÃO deve deletar a imagem do storage se a exclusão do produto no banco falhar (ex: FK constraint)', async () => {
      mockDb.deleteProduct = vi.fn().mockRejectedValue(new Error('foreign key constraint violation'))

      await expect(
        deleteProductWithImage(
          'prod-1',
          'items/produto-vendido.webp',
          { storage: mockStorage, db: mockDb }
        )
      ).rejects.toThrow(/foreign key/i)

      expect(mockDb.deleteProduct).toHaveBeenCalledWith('prod-1')
      expect(mockStorage.remove).not.toHaveBeenCalled()
    })

    it('deve deletar a imagem do storage somente após sucesso na exclusão do produto no banco', async () => {
      const executionOrder: string[] = []
      mockDb.deleteProduct = vi.fn().mockImplementation(async () => {
        executionOrder.push('delete_db')
        return { error: null }
      })
      mockStorage.remove = vi.fn().mockImplementation(async () => {
        executionOrder.push('delete_storage')
        return { error: null }
      })

      await deleteProductWithImage(
        'prod-1',
        'items/produto.webp',
        { storage: mockStorage, db: mockDb }
      )

      expect(executionOrder).toEqual(['delete_db', 'delete_storage'])
      expect(mockStorage.remove).toHaveBeenCalledWith(['items/produto.webp'])
    })
  })
})
