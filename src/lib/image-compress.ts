export const MAX_ORIGINAL_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_WEBP_SIZE_BYTES = 300 * 1024 // 300 KB
export const MAX_DIMENSION_PX = 800
export const DEFAULT_QUALITY = 0.8

export interface ImageDimensions {
  width: number
  height: number
}

export interface EncodedImageResult {
  blob: Blob
  outputWidth: number
  outputHeight: number
}

export interface ImageEncoder {
  readDimensions(file: Blob): Promise<ImageDimensions>
  encode(
    dimensions: ImageDimensions,
    file: Blob,
    quality: number
  ): Promise<EncodedImageResult>
}

export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension = MAX_DIMENSION_PX
): ImageDimensions {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height }
  }

  if (width > height) {
    const scale = maxDimension / width
    return {
      width: maxDimension,
      height: Math.round(height * scale),
    }
  } else {
    const scale = maxDimension / height
    return {
      width: Math.round(width * scale),
      height: maxDimension,
    }
  }
}

/**
 * Encoder padrão baseado na API Canvas do navegador
 */
export const browserCanvasEncoder: ImageEncoder = {
  async readDimensions(file: Blob): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Falha ao decodificar a imagem.'))
      }

      img.src = url
    })
  },

  async encode(
    dimensions: ImageDimensions,
    file: Blob,
    quality: number
  ): Promise<EncodedImageResult> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        canvas.width = dimensions.width
        canvas.height = dimensions.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível obter contexto 2D do Canvas.'))
          return
        }

        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao exportar imagem para WebP.'))
              return
            }
            resolve({
              blob,
              outputWidth: dimensions.width,
              outputHeight: dimensions.height,
            })
          },
          'image/webp',
          quality
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Falha ao carregar imagem para compressão.'))
      }

      img.src = url
    })
  },
}

export interface CompressOptions {
  encoder?: ImageEncoder
  maxDimension?: number
  quality?: number
}

export interface CompressedImageResult {
  blob: Blob
  width: number
  height: number
}

/**
 * Comprime uma imagem client-side para o formato WebP com restrições rígidas
 */
export async function compressImageToWebP(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressedImageResult> {
  // 1. Validação de tamanho original (< 5 MB)
  if (file.size > MAX_ORIGINAL_SIZE_BYTES) {
    throw new Error(
      `O arquivo original tem ${(file.size / (1024 * 1024)).toFixed(1)} MB. O tamanho máximo permitido é de 5 MB.`
    )
  }

  // 2. Validação de tipo MIME
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.')
  }

  const encoder = options.encoder || browserCanvasEncoder
  const maxDimension = options.maxDimension || MAX_DIMENSION_PX
  const quality = options.quality ?? DEFAULT_QUALITY

  // 3. Obtenção e cálculo de dimensões proporcionais
  const originalDims = await encoder.readDimensions(file)
  const targetDims = calculateTargetDimensions(
    originalDims.width,
    originalDims.height,
    maxDimension
  )

  // 4. Codificação para WebP
  const encoded = await encoder.encode(targetDims, file, quality)

  // 5. Validação estrita do WebP final (< 300 KB)
  if (encoded.blob.size > MAX_WEBP_SIZE_BYTES) {
    throw new Error(
      `A imagem comprimida ficou com ${(encoded.blob.size / 1024).toFixed(0)} KB, excedendo o teto estrito de 300 KB. Escolha outra imagem.`
    )
  }

  return {
    blob: encoded.blob,
    width: encoded.outputWidth,
    height: encoded.outputHeight,
  }
}
