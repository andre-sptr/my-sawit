import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({
  isAuthenticated: vi.fn(async () => true),
  isAuthEnabled: vi.fn(() => false),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/auth', () => authMock)

import { GET } from '@/app/uploads/[filename]/route'

let tempRoot: string
let cwdSpy: ReturnType<typeof vi.spyOn>

describe('GET /uploads/[filename]', () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'mysawit-upload-route-'))
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempRoot)
    vi.clearAllMocks()
    authMock.isAuthenticated.mockResolvedValue(true)
    authMock.isAuthEnabled.mockReturnValue(false)
  })

  afterEach(async () => {
    cwdSpy.mockRestore()
    await rm(tempRoot, { recursive: true, force: true })
  })

  it('mengembalikan 401 saat auth aktif dan user belum login', async () => {
    authMock.isAuthEnabled.mockReturnValue(true)
    authMock.isAuthenticated.mockResolvedValue(false)

    const res = await GET(new NextRequest('http://localhost/uploads/test.jpg'), {
      params: Promise.resolve({ filename: 'test.jpg' }),
    })
    expect(res.status).toBe(401)
  })

  it('mengembalikan 200 + header keamanan + private cache saat auth aktif', async () => {
    authMock.isAuthEnabled.mockReturnValue(true)
    authMock.isAuthenticated.mockResolvedValue(true)
    const dir = path.join(tempRoot, 'storage', 'uploads')
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'foto.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))

    const res = await GET(new NextRequest('http://localhost/uploads/foto.png'), {
      params: Promise.resolve({ filename: 'foto.png' }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('mengembalikan 404 pada path traversal atau file tidak ada', async () => {
    await writeFile(path.join(tempRoot, '.env'), 'SECRET=1')

    const resTraversal = await GET(new NextRequest('http://localhost/uploads/..%2F.env'), {
      params: Promise.resolve({ filename: '../.env' }),
    })
    expect(resTraversal.status).toBe(404)

    const resMissing = await GET(new NextRequest('http://localhost/uploads/none.jpg'), {
      params: Promise.resolve({ filename: 'none.jpg' }),
    })
    expect(resMissing.status).toBe(404)
  })
})
