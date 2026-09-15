/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Trash2, Loader2, ImagePlus, X, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { compressImageToWebP } from '@/lib/image-compress'
import { getPublicProductImageUrl } from '@/lib/product-image-service'

interface Product {
  id: string
  name: string
  category: string
  price: number
  description?: string | null
  image_path?: string | null
  active: boolean
}

interface ProductsClientProps {
  products: Product[]
  createProduct: (formData: FormData) => Promise<void>
  updateProductFull: (formData: FormData) => Promise<void>
  toggleProductStatus: (id: string, currentActive: boolean) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
}

export default function ProductsClient({
  products,
  createProduct,
  updateProductFull,
  toggleProductStatus,
  deleteProduct,
}: ProductsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Estados para o formulário de criação
  const [newImageBlob, setNewImageBlob] = useState<Blob | null>(null)
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null)
  const [newImageSize, setNewImageSize] = useState<number | null>(null)
  const [isCompressingNew, setIsCompressingNew] = useState(false)
  const newFileInputRef = useRef<HTMLInputElement | null>(null)

  // Estados para o formulário de edição
  const [editImageBlob, setEditImageBlob] = useState<Blob | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [editImageSize, setEditImageSize] = useState<number | null>(null)
  const [shouldRemoveExistingImage, setShouldRemoveExistingImage] = useState(false)
  const [isCompressingEdit, setIsCompressingEdit] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement | null>(null)

  const supabase = createClient()

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Tratamento da imagem no formulário de criação
  const handleNewImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressingNew(true)
    try {
      const result = await compressImageToWebP(file)
      setNewImageBlob(result.blob)
      setNewImagePreview(URL.createObjectURL(result.blob))
      setNewImageSize(result.blob.size)
      toast.success(`Foto comprimida com sucesso: ${(result.blob.size / 1024).toFixed(0)} KB`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar imagem.')
      if (newFileInputRef.current) newFileInputRef.current.value = ''
    } finally {
      setIsCompressingNew(false)
    }
  }

  const clearNewImage = () => {
    setNewImageBlob(null)
    setNewImagePreview(null)
    setNewImageSize(null)
    if (newFileInputRef.current) newFileInputRef.current.value = ''
  }

  // Tratamento da imagem na edição
  const handleEditImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsCompressingEdit(true)
    try {
      const result = await compressImageToWebP(file)
      setEditImageBlob(result.blob)
      setEditImagePreview(URL.createObjectURL(result.blob))
      setEditImageSize(result.blob.size)
      setShouldRemoveExistingImage(false)
      toast.success(`Nova foto pronta: ${(result.blob.size / 1024).toFixed(0)} KB`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar imagem.')
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    } finally {
      setIsCompressingEdit(false)
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setEditImageBlob(null)
    setEditImagePreview(null)
    setEditImageSize(null)
    setShouldRemoveExistingImage(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditImageBlob(null)
    setEditImagePreview(null)
    setEditImageSize(null)
    setShouldRemoveExistingImage(false)
  }

  return (
    <div className="space-y-6">
      {/* Formulário Novo Produto */}
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
        <h2 className="text-lg font-semibold mb-4 text-slate-300">Novo Produto</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const formData = new FormData(form)

            startTransition(async () => {
              let uploadedPath: string | null = null

              try {
                // 1. Se tem imagem selecionada, faz upload ao storage
                if (newImageBlob) {
                  const uniqueId = crypto.randomUUID()
                  uploadedPath = `items/${uniqueId}.webp`
                  const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(uploadedPath, newImageBlob, { contentType: 'image/webp' })

                  if (uploadError) {
                    throw new Error(`Falha no upload da foto: ${uploadError.message}`)
                  }
                  formData.set('image_path', uploadedPath)
                }

                // 2. Chama a action no servidor
                await createProduct(formData)

                // 3. Sucesso: limpa formulário
                form.reset()
                clearNewImage()
                toast.success('Produto criado com sucesso!')
              } catch (err: any) {
                // Compensação: se o upload ocorreu mas a criação falhou, limpa o arquivo
                if (uploadedPath) {
                  await supabase.storage.from('products').remove([uploadedPath])
                }
                toast.error('Erro ao cadastrar produto: ' + err.message)
              }
            })
          }}
          className="space-y-4"
        >
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-slate-400 mb-1 block">Nome</label>
              <Input name="name" placeholder="Ex: Cerveja IPA 600ml" required />
            </div>
            <div className="w-48">
              <label className="text-sm text-slate-400 mb-1 block">Categoria</label>
              <Input name="category" placeholder="Ex: BEBIDAS" className="uppercase" required />
            </div>
            <div className="w-32">
              <label className="text-sm text-slate-400 mb-1 block">Preço (R$)</label>
              <Input name="price" placeholder="25,90" step="0.01" type="number" required />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-1 block">Descrição / Ingredientes (opcional)</label>
            <Input name="description" placeholder="Ex: Cerveja artesanal com notas cítricas e lúpulo aromático" />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <input
                ref={newFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleNewImageSelected}
                className="hidden"
                id="new-product-image"
                disabled={isCompressingNew || isPending}
              />
              <label
                htmlFor="new-product-image"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer transition-colors border border-slate-700"
              >
                {isCompressingNew ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Otimizando foto...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 text-amber-500" />
                    <span>Adicionar Foto (WebP)</span>
                  </>
                )}
              </label>
            </div>

            {newImagePreview && (
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <img
                  src={newImagePreview}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover aspect-square"
                />
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-200">Pronta para envio</p>
                  <p>{newImageSize ? `${(newImageSize / 1024).toFixed(0)} KB (WebP)` : ''}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearNewImage}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending || isCompressingNew}
              className="ml-auto bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cadastrar Produto
            </Button>
          </div>
        </form>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar produto por nome, categoria ou descrição..."
            className="bg-transparent border-none text-slate-200 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-slate-950 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Foto</th>
                <th className="px-6 py-4 font-medium">Nome / Descrição</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                <th className="px-6 py-4 font-medium">Preço</th>
                <th className="px-6 py-4 font-medium">Ativo</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredProducts.map((product) => {
                const isEditing = editingId === product.id
                const currentPhotoUrl = getPublicProductImageUrl(product.image_path)

                if (isEditing) {
                  return (
                    <tr key={product.id} className="bg-slate-800/80">
                      <td colSpan={6} className="p-4">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            const form = e.currentTarget
                            const formData = new FormData(form)

                            startTransition(async () => {
                              let newUploadedPath: string | null = null

                              try {
                                // 1. Se enviou nova imagem, faz upload com UUID
                                if (editImageBlob) {
                                  const uniqueId = crypto.randomUUID()
                                  newUploadedPath = `items/${uniqueId}.webp`
                                  const { error: uploadError } = await supabase.storage
                                    .from('products')
                                    .upload(newUploadedPath, editImageBlob, { contentType: 'image/webp' })

                                  if (uploadError) {
                                    throw new Error(`Falha no upload da nova imagem: ${uploadError.message}`)
                                  }

                                  formData.set('image_path', newUploadedPath)
                                  formData.set('old_image_path', product.image_path || '')
                                  formData.set('should_delete_old', 'true')
                                } else if (shouldRemoveExistingImage) {
                                  formData.set('image_path', '')
                                  formData.set('old_image_path', product.image_path || '')
                                  formData.set('should_delete_old', 'true')
                                }

                                // 2. Atualiza no banco
                                await updateProductFull(formData)
                                cancelEdit()
                                toast.success('Produto atualizado com sucesso!')
                              } catch (error: any) {
                                // Compensação: se o upload da nova foto ocorreu mas o banco falhou, deleta a nova foto
                                if (newUploadedPath) {
                                  await supabase.storage.from('products').remove([newUploadedPath])
                                }
                                toast.error('Erro ao salvar produto: ' + error.message)
                              }
                            })
                          }}
                          className="space-y-4"
                        >
                          <input type="hidden" name="id" value={product.id} />
                          <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[200px]">
                              <label className="text-xs text-slate-400 mb-1 block">Nome</label>
                              <Input
                                name="name"
                                defaultValue={product.name}
                                className="bg-slate-950 border-slate-700 font-bold text-amber-500 uppercase tracking-wider"
                                required
                              />
                            </div>
                            <div className="w-48">
                              <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                              <Input
                                name="category"
                                defaultValue={product.category}
                                className="bg-slate-950 border-slate-700 text-slate-300 uppercase"
                                required
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-xs text-slate-400 mb-1 block">Preço (R$)</label>
                              <Input
                                name="price"
                                defaultValue={product.price}
                                step="0.01"
                                type="number"
                                className="bg-slate-950 border-slate-700"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-slate-400 mb-1 block">Descrição / Ingredientes (opcional)</label>
                            <Input
                              name="description"
                              defaultValue={product.description || ''}
                              placeholder="Descrição dos ingredientes ou detalhes"
                              className="bg-slate-950 border-slate-700 text-slate-300 text-sm"
                            />
                          </div>

                          {/* Seção de Imagem na Edição */}
                          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-700/60">
                            <div className="flex items-center gap-3">
                              {/* Preview da foto atual ou nova */}
                              {editImagePreview ? (
                                <div className="relative">
                                  <img
                                    src={editImagePreview}
                                    alt="Nova foto"
                                    className="w-14 h-14 rounded-xl object-cover aspect-square border border-emerald-500"
                                  />
                                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    Nova
                                  </span>
                                </div>
                              ) : currentPhotoUrl && !shouldRemoveExistingImage ? (
                                <img
                                  src={currentPhotoUrl}
                                  alt={product.name}
                                  className="w-14 h-14 rounded-xl object-cover aspect-square border border-slate-700"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
                                  <ImageIcon className="w-6 h-6" />
                                </div>
                              )}

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <input
                                    ref={editFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleEditImageSelected}
                                    className="hidden"
                                    id={`edit-img-${product.id}`}
                                    disabled={isCompressingEdit || isPending}
                                  />
                                  <label
                                    htmlFor={`edit-img-${product.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                                  >
                                    <ImagePlus className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{currentPhotoUrl ? 'Trocar foto' : 'Enviar foto'}</span>
                                  </label>

                                  {(currentPhotoUrl || editImagePreview) && !shouldRemoveExistingImage && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setShouldRemoveExistingImage(true)
                                        setEditImageBlob(null)
                                        setEditImagePreview(null)
                                        if (editFileInputRef.current) editFileInputRef.current.value = ''
                                      }}
                                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8"
                                    >
                                      Remover foto
                                    </Button>
                                  )}

                                  {shouldRemoveExistingImage && (
                                    <span className="text-xs text-amber-400">
                                      Foto será removida ao salvar
                                    </span>
                                  )}
                                </div>
                                {editImageSize && (
                                  <p className="text-[11px] text-emerald-400">
                                    WebP: {(editImageSize / 1024).toFixed(0)} KB
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-auto">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEdit}
                                disabled={isPending}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold"
                                disabled={isPending || isCompressingEdit}
                              >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                Salvar Alterações
                              </Button>
                            </div>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Foto */}
                    <td className="px-6 py-4">
                      {currentPhotoUrl ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 aspect-square">
                          <img
                            src={currentPhotoUrl}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-600">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* Nome e Descrição */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-amber-500 uppercase tracking-wider text-base">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-2 max-w-sm">
                          {product.description}
                        </div>
                      )}
                    </td>

                    {/* Categoria */}
                    <td className="px-6 py-4 text-slate-300">{product.category}</td>

                    {/* Preço */}
                    <td className="px-6 py-4 font-bold text-amber-500 whitespace-nowrap">
                      R$ {product.price.toFixed(2)}
                    </td>

                    {/* Ativo */}
                    <td className="px-6 py-4">
                      {product.active ? (
                        <span className="text-emerald-500 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs font-semibold px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                          Inativo
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(product)}
                          className="text-slate-400 hover:text-amber-500"
                          disabled={isPending}
                        >
                          Editar
                        </Button>
                        <form
                          action={() => {
                            startTransition(async () => {
                              try {
                                await toggleProductStatus(product.id, product.active)
                              } catch {
                                toast.error('Erro ao alterar status.')
                              }
                            })
                          }}
                        >
                          <Button
                            variant={product.active ? 'destructive' : 'secondary'}
                            size="sm"
                            disabled={isPending}
                          >
                            {product.active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </form>
                        <form
                          action={() => {
                            if (
                              window.confirm(
                                'Tem certeza que deseja apagar este produto permanentemente?'
                              )
                            ) {
                              startTransition(async () => {
                                try {
                                  await deleteProduct(product.id)
                                  toast.success('Produto excluído com sucesso!')
                                } catch (err: any) {
                                  if (err.message?.includes('foreign key constraint')) {
                                    toast.error(
                                      'Não é possível excluir um produto que já foi vendido em uma comanda. Por favor, apenas desative-o.',
                                      { duration: 5000 }
                                    )
                                  } else {
                                    toast.error('Erro ao excluir: ' + err.message)
                                  }
                                }
                              })
                            }
                          }}
                        >
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border-0"
                            disabled={isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
