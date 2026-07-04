import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const maxPhotoSizeBytes = 10 * 1024 * 1024

export async function saveOptionalPhoto(formData: FormData, fieldName = 'photo') {
  const photo = formData.get(fieldName)

  if (!isFile(photo) || photo.size === 0) {
    return null
  }

  if (photo.size > maxPhotoSizeBytes) {
    throw new Error('Ukuran foto maksimal 10 MB.')
  }

  const buffer = Buffer.from(await photo.arrayBuffer())
  const extension = getImageExtension(buffer)

  if (!extension) {
    throw new Error('Foto harus berformat JPG, PNG, atau WebP.')
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  const filename = `${Date.now()}-${randomUUID()}.${extension}`

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buffer)

  return `/uploads/${filename}`
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

function getImageExtension(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg'
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }

  if (buffer.subarray(0, 4).equals(Buffer.from('RIFF')) && buffer.subarray(8, 12).equals(Buffer.from('WEBP'))) {
    return 'webp'
  }

  return null
}
