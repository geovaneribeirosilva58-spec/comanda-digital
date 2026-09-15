import { randomUUID } from 'crypto'

export interface StorageClientAdapter {
  upload(path: string, blob: Blob): Promise<{ error: { message: string } | null }>
  remove(paths: string[]): Promise<{ error: { message: string } | null }>
}

export interface DatabaseClientAdapter {
  insertProduct(data: {
    name: string
    category: string
    price: number
    description?: string | null
    image_path?: string | null
    active?: boolean
  }): Promise<{ id: string; error?: unknown }>
  updateProduct(
    id: string,
    data: {
      name?: string
      category?: string
      price?: number
      description?: string | null
      image_path?: string | null
      active?: boolean
    }
  ): Promise<{ error?: unknown }>
  deleteProduct(id: string): Promise<{ error?: unknown }>
}

export interface ProductInputData {
  name: string
  category: string
  price: number
  description?: string | null
  active?: boolean
}

export interface UpdateImageOptions {
  currentImagePath?: string | null
  newImageBlob?: Blob | null
  shouldRemoveImage?: boolean
}

export interface ServiceAdapters {
  storage: StorageClientAdapter
  db: DatabaseClientAdapter
}

interface GenericSupabaseClient {
  storage: {
    from(bucket: string): {
      upload(path: string, blob: Blob, options?: { contentType?: string; upsert?: boolean }): Promise<{ error: { message: string } | null }>
      remove(paths: string[]): Promise<{ error: { message: string } | null }>
    }
  }
  from(table: string): {
    insert(data: unknown): {
      select(col: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
    update(data: unknown): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>
    }
    delete(): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>
    }
  }
}

/**
 * Cria adaptadores padrão usando um cliente Supabase
 */
export function createSupabaseAdapters(supabase: GenericSupabaseClient): ServiceAdapters {
  return {
    storage: {
      async upload(path: string, blob: Blob) {
        return supabase.storage.from('products').upload(path, blob, {
          contentType: 'image/webp',
          upsert: false,
        })
      },
      async remove(paths: string[]) {
        return supabase.storage.from('products').remove(paths)
      },
    },
    db: {
      async insertProduct(data: unknown) {
        const { data: inserted, error } = await supabase
          .from('products')
          .insert(data)
          .select('id')
          .single()
        if (error || !inserted) throw new Error(error?.message || 'Erro ao inserir produto.')
        return inserted
      },
      async updateProduct(id: string, data: unknown) {
        const { error } = await supabase.from('products').update(data).eq('id', id)
        if (error) throw new Error(error.message)
        return { error: null }
      },
      async deleteProduct(id: string) {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) throw new Error(error.message)
        return { error: null }
      },
    },
  }
}

/**
 * Constrói a URL pública do CDN do Supabase a partir do image_path relativo
 */
export function getPublicProductImageUrl(
  imagePath: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
): string | null {
  if (!imagePath) return null
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const cleanUrl = (supabaseUrl || '').replace(/\/+$/, '')
  const cleanPath = imagePath.replace(/^\/+/, '')
  return `${cleanUrl}/storage/v1/object/public/products/${cleanPath}`
}

/**
 * Criação de produto com imagem e compensação em caso de erro no banco
 */
export async function createProductWithImage(
  productData: ProductInputData,
  imageBlob: Blob | null,
  adapters: ServiceAdapters
): Promise<{ id: string }> {
  let uploadedPath: string | null = null

  try {
    if (imageBlob) {
      const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID()
      uploadedPath = `items/${uniqueId}.webp`

      const uploadRes = await adapters.storage.upload(uploadedPath, imageBlob)
      if (uploadRes.error) {
        throw new Error(`Falha no upload para o Storage: ${uploadRes.error.message}`)
      }
    }

    const inserted = await adapters.db.insertProduct({
      ...productData,
      image_path: uploadedPath,
    })

    return inserted
  } catch (error) {
    // Compensação: se o upload ocorreu mas o banco falhou, deleta o arquivo órfão
    if (uploadedPath) {
      try {
        await adapters.storage.remove([uploadedPath])
      } catch (cleanupError) {
        console.error('Falha na limpeza compensatória de imagem:', cleanupError)
      }
    }
    throw error
  }
}

/**
 * Atualização de produto com imagem, compensação de falha e ordem estrita
 */
export async function updateProductWithImage(
  productId: string,
  productData: ProductInputData,
  options: UpdateImageOptions,
  adapters: ServiceAdapters
): Promise<void> {
  const { currentImagePath, newImageBlob, shouldRemoveImage } = options
  let newUploadedPath: string | null = null

  try {
    let finalImagePath: string | null | undefined = currentImagePath

    if (newImageBlob) {
      // 1. Envia a nova imagem
      const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : randomUUID()
      newUploadedPath = `items/${uniqueId}.webp`

      const uploadRes = await adapters.storage.upload(newUploadedPath, newImageBlob)
      if (uploadRes.error) {
        throw new Error(`Falha no upload da nova imagem: ${uploadRes.error.message}`)
      }
      finalImagePath = newUploadedPath
    } else if (shouldRemoveImage) {
      finalImagePath = null
    }

    // 2. Atualiza no banco de dados primeiro
    await adapters.db.updateProduct(productId, {
      ...productData,
      image_path: finalImagePath,
    })

    // 3. Sucesso confirmado no banco: agora sim limpa a imagem antiga
    if (newImageBlob && currentImagePath) {
      await adapters.storage.remove([currentImagePath])
    } else if (shouldRemoveImage && currentImagePath) {
      await adapters.storage.remove([currentImagePath])
    }
  } catch (error) {
    // Compensação: se o upload da nova imagem foi feito mas o update do banco falhou,
    // apaga a imagem nova e preserva a antiga intacta
    if (newUploadedPath) {
      try {
        await adapters.storage.remove([newUploadedPath])
      } catch (cleanupError) {
        console.error('Falha na limpeza compensatória da nova imagem:', cleanupError)
      }
    }
    throw error
  }
}

/**
 * Exclusão de produto com ordem estrita: banco primeiro, storage depois
 */
export async function deleteProductWithImage(
  productId: string,
  imagePath: string | null | undefined,
  adapters: ServiceAdapters
): Promise<void> {
  // 1. Deleta no banco de dados primeiro (se falhar por FK, lança erro antes de tocar no storage)
  await adapters.db.deleteProduct(productId)

  // 2. Banco confirmou exclusão: se havia imagem associada, deleta do storage
  if (imagePath) {
    try {
      await adapters.storage.remove([imagePath])
    } catch (storageError) {
      console.error('Produto deletado, mas falha ao remover arquivo do Storage:', storageError)
    }
  }
}
