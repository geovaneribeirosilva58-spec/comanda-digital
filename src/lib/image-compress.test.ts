import { describe, it, expect } from 'vitest'
import {
  compressImageToWebP,
  MAX_WEBP_SIZE_BYTES,
} from './image-compress'

describe('Seam 1: compressImageToWebP', () => {
  it('deve rejeitar arquivo original acima de 5 MB antes do processamento', async () => {
    const oversizedBlob = new Blob(['x'.repeat(100)], { type: 'image/jpeg' })
    Object.defineProperty(oversizedBlob, 'size', { value: 5 * 1024 * 1024 + 1 })

    await expect(
      compressImageToWebP(oversizedBlob as File)
    ).rejects.toThrow(/5\s*MB/i)
  })

  it('deve rejeitar arquivos que não são imagem', async () => {
    const textBlob = new Blob(['texto'], { type: 'text/plain' })

    await expect(
      compressImageToWebP(textBlob as File)
    ).rejects.toThrow(/imagem/i)
  })

  it('deve calcular dimensões proporcionais limitadas a 800px', async () => {
    const mockEncoder = {
      encode: async (dims: { width: number; height: number }) => {
        return {
          blob: new Blob(['webp-data'], { type: 'image/webp' }),
          outputWidth: dims.width,
          outputHeight: dims.height,
        }
      },
      readDimensions: async () => ({ width: 1600, height: 1200 }),
    }

    const validBlob = new Blob(['fake-img'], { type: 'image/png' })
    const result = await compressImageToWebP(validBlob as File, { encoder: mockEncoder })

    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
    expect(result.blob.type).toBe('image/webp')
  })

  it('deve rejeitar se o WebP final exceder o teto estrito de 300 KB', async () => {
    const mockEncoder = {
      encode: async () => {
        const bigBlob = new Blob(['x'], { type: 'image/webp' })
        Object.defineProperty(bigBlob, 'size', { value: 300 * 1024 + 1 })
        return {
          blob: bigBlob,
          outputWidth: 800,
          outputHeight: 800,
        }
      },
      readDimensions: async () => ({ width: 800, height: 800 }),
    }

    const validBlob = new Blob(['fake-img'], { type: 'image/jpeg' })

    await expect(
      compressImageToWebP(validBlob as File, { encoder: mockEncoder })
    ).rejects.toThrow(/300\s*KB/i)
  })

  it('deve retornar o Blob WebP comprimido com sucesso quando dentro de 300 KB', async () => {
    const mockEncoder = {
      encode: async () => {
        const okBlob = new Blob(['ok-webp'], { type: 'image/webp' })
        Object.defineProperty(okBlob, 'size', { value: 50 * 1024 })
        return {
          blob: okBlob,
          outputWidth: 800,
          outputHeight: 800,
        }
      },
      readDimensions: async () => ({ width: 800, height: 800 }),
    }

    const validBlob = new Blob(['fake-img'], { type: 'image/jpeg' })
    const result = await compressImageToWebP(validBlob as File, { encoder: mockEncoder })

    expect(result.blob).toBeDefined()
    expect(result.blob.type).toBe('image/webp')
    expect(result.blob.size).toBeLessThanOrEqual(MAX_WEBP_SIZE_BYTES)
  })
})
