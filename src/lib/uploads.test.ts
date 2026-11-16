import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  deleteUploadedPhoto,
  resolveUploadedPhotoPath,
  resolveUploadFileByName,
  saveOptionalPhoto,
} from '@/lib/uploads'

let tempRoot: string
let cwdSpy: ReturnType<typeof vi.spyOn>

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

describe('uploads storage helpers', () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'mysawit-uploads-'))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempRoot)
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    await rm(tempRoot, { recursive: true, force: true })
  })

  it('menyimpan foto valid ke storage/uploads (bukan public/uploads) dan resolve kembali', async () => {
    const fd = new FormData()
    fd.set('photo', new File([PNG_BYTES], 'struk.png', { type: 'image/png' }))

    const photoPath = await saveOptionalPhoto(fd)
    expect(photoPath).toMatch(/^\/uploads\/.+\.png$/)

    const resolved = await resolveUploadedPhotoPath(photoPath!)
    expect(resolved).toBeTruthy()
    expect(resolved!).toContain(`${path.sep}storage${path.sep}uploads${path.sep}`)
    expect(resolved!).not.toContain(`${path.sep}public${path.sep}uploads${path.sep}`)
    const saved = await readFile(resolved!)
    expect(new Uint8Array(saved)).toEqual(PNG_BYTES)
  })

  it('menolak file bukan JPG/PNG/WebP dan ukuran > 10MB', async () => {
    const badFd = new FormData()
    badFd.set('photo', new File([new Uint8Array([1, 2, 3, 4])], 'evil.svg', { type: 'image/svg+xml' }))
    await expect(saveOptionalPhoto(badFd)).rejects.toThrow(/JPG, PNG, atau WebP/i)

    const bigFile = new File([JPG_BYTES], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 10 * 1024 * 1024 + 1 })
    const bigFd = new FormData()
    bigFd.set('photo', bigFile)
    await expect(saveOptionalPhoto(bigFd)).rejects.toThrow(/10 MB/i)
  })

  it('fallback membaca file lama di public/uploads jika tidak ada di storage/uploads', async () => {
    const legacyDir = path.join(tempRoot, 'public', 'uploads')
    await mkdir(legacyDir, { recursive: true })
    const legacyFile = path.join(legacyDir, 'legacy.jpg')
    await writeFile(legacyFile, JPG_BYTES)

    expect(await resolveUploadedPhotoPath('/uploads/legacy.jpg')).toBe(legacyFile)
    expect(await resolveUploadFileByName('legacy.jpg')).toBe(legacyFile)
  })

  it('menolak path traversal pada resolve & deleteUploadedPhoto', async () => {
    await writeFile(path.join(tempRoot, 'secret.txt'), 'secret')

    expect(await resolveUploadedPhotoPath('/uploads/../../secret.txt')).toBeNull()
    expect(await resolveUploadedPhotoPath('/etc/passwd')).toBeNull()
    expect(await resolveUploadFileByName('..\\secret.txt')).toBeNull()

    await deleteUploadedPhoto('/uploads/../../secret.txt')
    expect(await readFile(path.join(tempRoot, 'secret.txt'), 'utf8')).toBe('secret')
  })

  it('deleteUploadedPhoto menghapus file dari storage/uploads maupun public/uploads dan aman pada ENOENT', async () => {
    const fd = new FormData()
    fd.set('photo', new File([JPG_BYTES], 'foto.jpg', { type: 'image/jpeg' }))
    const photoPath = await saveOptionalPhoto(fd)
    expect(await resolveUploadedPhotoPath(photoPath!)).toBeTruthy()

    await deleteUploadedPhoto(photoPath)
    expect(await resolveUploadedPhotoPath(photoPath!)).toBeNull()
    await expect(deleteUploadedPhoto(photoPath)).resolves.toBeUndefined()
  })
})
