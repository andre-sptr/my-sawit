import { randomUUID } from 'node:crypto'
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const maxPhotoSizeBytes = 10 * 1024 * 1024

function primaryUploadDir() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage', 'uploads')
}

function legacyUploadDir() {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'uploads')
}

function isSafeFilename(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  if (name.includes('/') || name.includes('\\') || name.includes('..')) return false
  return path.basename(name) === name
}

function extractUploadFilename(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  const normalized = photoPath.replace(/^\/+/, '')
  if (!normalized.startsWith('uploads/')) return null
  const filename = normalized.slice('uploads/'.length)
  return isSafeFilename(filename) ? filename : null
}

async function existingFileInDir(dir: string, filename: string): Promise<string | null> {
  const candidate = path.join(/*turbopackIgnore: true*/ dir, filename)
  if (!candidate.startsWith(dir + path.sep)) return null
  try {
    const info = await stat(candidate)
    return info.isFile() ? candidate : null
  } catch {
    return null
  }
}

export async function resolveUploadFileByName(filename: string): Promise<string | null> {
  if (!isSafeFilename(filename)) return null
  const inPrimary = await existingFileInDir(primaryUploadDir(), filename)
  if (inPrimary) return inPrimary
  return existingFileInDir(legacyUploadDir(), filename)
}

export async function resolveUploadedPhotoPath(photoPath: string): Promise<string | null> {
  const filename = extractUploadFilename(photoPath)
  if (!filename) return null
  return resolveUploadFileByName(filename)
}

export async function deleteUploadedPhoto(photoPath: string | null | undefined): Promise<void> {
  const filename = extractUploadFilename(photoPath)
  if (!filename) return

  for (const dir of [primaryUploadDir(), legacyUploadDir()]) {
    const candidate = path.join(/*turbopackIgnore: true*/ dir, filename)
    if (!candidate.startsWith(dir + path.sep)) continue
    try {
      await unlink(candidate)
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn('[uploads] gagal menghapus foto lama:', error instanceof Error ? error.message : error)
      }
    }
  }
}

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

  const uploadDir = primaryUploadDir()
  const filename = `${Date.now()}-${randomUUID()}.${extension}`

  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(/*turbopackIgnore: true*/ uploadDir, filename), buffer)

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
