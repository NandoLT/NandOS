const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maxSourceBytes = 10 * 1024 * 1024
const avatarSize = 128

export async function prepareGuestAvatar(file: File): Promise<string> {
  if (!supportedTypes.has(file.type)) throw new Error('Elige una foto JPG, PNG o WebP.')
  if (file.size > maxSourceBytes) throw new Error('La foto no puede pesar más de 10 MB.')

  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try {
      await image.decode()
    } catch {
      throw new Error('No se ha podido leer esta imagen.')
    }
    const canvas = document.createElement('canvas')
    canvas.width = avatarSize
    canvas.height = avatarSize
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se ha podido preparar el avatar.')
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side,
      0, 0, avatarSize, avatarSize)
    return canvas.toDataURL('image/webp', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
