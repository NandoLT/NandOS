import { MAX_PAINT_SIDE } from '../domain/paint-raster'

const STORE = 'png'
export const MAX_PNG_BYTES = 5 * 1024 * 1024

async function withImages<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('nandos-paint', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onerror = () => reject(new Error('No se puede acceder a los dibujos de este navegador.'))
    request.onsuccess = () => resolve(request.result)
  })
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      const request = operation(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(new Error('No se pudo completar la operación con el dibujo.'))
    })
  } finally { database.close() }
}

export const loadPaintBlob = (id: string) => withImages<Blob | undefined>('readonly', (store) => store.get(id))
export const savePaintBlob = (id: string, png: Blob) => withImages('readwrite', (store) => store.put(png, id))
export const deletePaintBlob = (id: string) => withImages('readwrite', (store) => store.delete(id))

export function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((png) => {
    if (!png || png.size > MAX_PNG_BYTES) reject(new Error('No se pudo preparar el PNG o supera 5 MB.'))
    else resolve(png)
  }, 'image/png'))
}

export async function readPngSize(blob: Blob) {
  if (blob.size > MAX_PNG_BYTES) throw new Error('El PNG supera 5 MB.')
  const header = new Uint8Array(await blob.slice(0, 24).arrayBuffer())
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (header.length !== 24 || signature.some((byte, index) => header[index] !== byte) ||
    String.fromCharCode(...header.slice(12, 16)) !== 'IHDR') throw new Error('El archivo debe ser un PNG válido.')
  const view = new DataView(header.buffer)
  const width = view.getUint32(16), height = view.getUint32(20)
  if (!width || !height || width > MAX_PAINT_SIDE || height > MAX_PAINT_SIDE) {
    throw new Error('El PNG debe medir como máximo ' + MAX_PAINT_SIDE + ' × ' + MAX_PAINT_SIDE + ' píxeles.')
  }
  return { width, height }
}
