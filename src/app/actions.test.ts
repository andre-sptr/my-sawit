import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({
  requireAuth: vi.fn(async () => {}),
}))
const uploadsMock = vi.hoisted(() => ({
  saveOptionalPhoto: vi.fn(async () => null as string | null),
  deleteUploadedPhoto: vi.fn(async () => {}),
}))
const notifyMock = vi.hoisted(() => ({
  notifyHarvestCreated: vi.fn(async () => {}),
  notifyHarvestUpdated: vi.fn(async () => {}),
  notifyHarvestDeleted: vi.fn(async () => {}),
  notifyMaintenanceCreated: vi.fn(async () => {}),
  notifyMaintenanceUpdated: vi.fn(async () => {}),
  notifyMaintenanceDeleted: vi.fn(async () => {}),
  notifyExpenseCreated: vi.fn(async () => {}),
  notifyExpenseUpdated: vi.fn(async () => {}),
  notifyExpenseDeleted: vi.fn(async () => {}),
  notifySaleCreated: vi.fn(async () => {}),
  notifySaleUpdated: vi.fn(async () => {}),
  notifySaleDeleted: vi.fn(async () => {}),
}))
const cacheMock = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}))
const prismaMock = vi.hoisted(() => ({
  kapling: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  harvest: {
    findFirst: vi.fn(),
    findMany: vi.fn(async (): Promise<Array<{ photoPath: string | null }>> => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  maintenance: {
    findFirst: vi.fn(),
    findMany: vi.fn(async (): Promise<Array<{ photoPath: string | null }>> => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  expense: {
    findFirst: vi.fn(),
    findMany: vi.fn(async (): Promise<Array<{ photoPath: string | null }>> => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  sale: {
    findFirst: vi.fn(),
    findMany: vi.fn(async (): Promise<Array<{ photoPath: string | null }>> => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  dropdownOption: {
    findMany: vi.fn(async (): Promise<Array<{ value: string; label: string }>> => []),
    aggregate: vi.fn(async () => ({ _max: { sortOrder: 0 } })),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}))

vi.mock('@/lib/auth', () => authMock)
vi.mock('@/lib/uploads', () => uploadsMock)
vi.mock('@/lib/notify', () => notifyMock)
vi.mock('next/cache', () => cacheMock)
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  addDropdownOption,
  createExpense,
  createHarvest,
  createKapling,
  deleteHarvest,
  deleteKaplingPermanent,
  updateHarvest,
} from '@/app/actions'

function fd(entries: Record<string, string>) {
  const formData = new FormData()
  for (const [k, v] of Object.entries(entries)) {
    formData.set(k, v)
  }
  return formData
}

describe('server actions hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.requireAuth.mockResolvedValue(undefined)
    uploadsMock.saveOptionalPhoto.mockResolvedValue(null)
    prismaMock.kapling.findUnique.mockResolvedValue({ id: 'k1', name: 'Blok A', isActive: true })
  })

  it('menolak aksi ketika user belum login', async () => {
    authMock.requireAuth.mockRejectedValueOnce(new Error('Sesi berakhir. Silakan login kembali.'))
    const res = await createKapling(null, fd({ name: 'Blok Z' }))
    expect(res).toEqual({ ok: false, message: 'Sesi berakhir. Silakan login kembali.' })
    expect(prismaMock.kapling.create).not.toHaveBeenCalled()
  })

  it('menolak createHarvest pada kapling nonaktif dan tidak menulis foto ke disk', async () => {
    prismaMock.kapling.findUnique.mockResolvedValueOnce({ id: 'k1', name: 'Blok D', isActive: false })
    const res = await createHarvest(
      null,
      fd({ kaplingId: 'k1', harvestDate: '2026-07-01', weightKg: '100' }),
    )
    expect(res.ok).toBe(false)
    expect(res.message).toMatch(/nonaktif/i)
    expect(uploadsMock.saveOptionalPhoto).not.toHaveBeenCalled()
    expect(prismaMock.harvest.create).not.toHaveBeenCalled()
  })

  it('memvalidasi input sebelum upload foto sehingga validasi gagal tidak meninggalkan file yatim', async () => {
    const res = await createHarvest(
      null,
      fd({ kaplingId: 'k1', harvestDate: '2026-02-30', weightKg: '100' }),
    )
    expect(res.ok).toBe(false)
    expect(uploadsMock.saveOptionalPhoto).not.toHaveBeenCalled()
  })

  it('updateHarvest menolak record dengan kaplingId tidak cocok dan menghapus foto lama saat diganti', async () => {
    prismaMock.harvest.findFirst.mockResolvedValueOnce(null)
    const mismatch = await updateHarvest(
      null,
      fd({ id: 'h1', kaplingId: 'k-other', harvestDate: '2026-07-01', weightKg: '50' }),
    )
    expect(mismatch.ok).toBe(false)
    expect(prismaMock.harvest.update).not.toHaveBeenCalled()

    prismaMock.harvest.findFirst.mockResolvedValueOnce({
      id: 'h1',
      kaplingId: 'k1',
      photoPath: '/uploads/old.jpg',
      kapling: { name: 'Blok A', isActive: true },
    })
    uploadsMock.saveOptionalPhoto.mockResolvedValueOnce('/uploads/new.jpg')
    prismaMock.harvest.update.mockResolvedValueOnce({
      id: 'h1',
      kaplingId: 'k1',
      harvestDate: new Date('2026-06-30T17:00:00.000Z'),
      weightKg: 120,
      photoPath: '/uploads/new.jpg',
      note: null,
      kapling: { name: 'Blok A' },
    })

    const updated = await updateHarvest(
      null,
      fd({ id: 'h1', kaplingId: 'k1', harvestDate: '2026-07-01', weightKg: '120' }),
    )
    expect(updated.ok).toBe(true)
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/old.jpg')
  })

  it('updateHarvest mendukung removePhoto=1 untuk menghapus foto tanpa mengganti', async () => {
    prismaMock.harvest.findFirst.mockResolvedValueOnce({
      id: 'h1',
      kaplingId: 'k1',
      photoPath: '/uploads/old.jpg',
      kapling: { name: 'Blok A', isActive: true },
    })
    prismaMock.harvest.update.mockResolvedValueOnce({
      id: 'h1',
      kaplingId: 'k1',
      harvestDate: new Date('2026-06-30T17:00:00.000Z'),
      weightKg: 120,
      photoPath: null,
      note: null,
      kapling: { name: 'Blok A' },
    })

    const res = await updateHarvest(
      null,
      fd({ id: 'h1', kaplingId: 'k1', harvestDate: '2026-07-01', weightKg: '120', removePhoto: '1' }),
    )
    expect(res.ok).toBe(true)
    expect(prismaMock.harvest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoPath: null }),
      }),
    )
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/old.jpg')
  })

  it('deleteHarvest & deleteKaplingPermanent menghapus file foto terkait dari disk', async () => {
    prismaMock.harvest.findFirst.mockResolvedValueOnce({
      id: 'h1',
      kaplingId: 'k1',
      harvestDate: new Date('2026-06-30T17:00:00.000Z'),
      weightKg: 80,
      note: null,
      photoPath: '/uploads/h1.jpg',
      kapling: { name: 'Blok A' },
    })
    const delOne = await deleteHarvest(null, fd({ id: 'h1', kaplingId: 'k1' }))
    expect(delOne.ok).toBe(true)
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/h1.jpg')

    prismaMock.harvest.findMany.mockResolvedValueOnce([{ photoPath: '/uploads/a.jpg' }])
    prismaMock.maintenance.findMany.mockResolvedValueOnce([{ photoPath: null }])
    prismaMock.expense.findMany.mockResolvedValueOnce([{ photoPath: '/uploads/b.png' }])
    prismaMock.sale.findMany.mockResolvedValueOnce([{ photoPath: '/uploads/c.webp' }])

    const delKapling = await deleteKaplingPermanent(null, fd({ id: 'k1' }))
    expect(delKapling.ok).toBe(true)
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/a.jpg')
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/b.png')
    expect(uploadsMock.deleteUploadedPhoto).toHaveBeenCalledWith('/uploads/c.webp')
  })

  it('addDropdownOption menolak grup invalid dan merevalidasi halaman kapling', async () => {
    const bad = await addDropdownOption(null, fd({ group: 'hacked', label: 'Tes' }))
    expect(bad.ok).toBe(false)
    expect(prismaMock.dropdownOption.create).not.toHaveBeenCalled()

    const good = await addDropdownOption(
      null,
      fd({ group: 'expenseCategory', label: 'Sewa Truk', kaplingId: 'k1' }),
    )
    expect(good.ok).toBe(true)
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/')
    expect(cacheMock.revalidatePath).toHaveBeenCalledWith('/kapling/k1')
  })

  it('createExpense meneruskan label kustom dari DropdownOption ke notifyExpenseCreated', async () => {
    prismaMock.dropdownOption.findMany.mockResolvedValueOnce([
      { value: 'SEWA_TRUK', label: 'Sewa Truk' },
    ])
    prismaMock.expense.create.mockResolvedValueOnce({
      id: 'e1',
      kaplingId: 'k1',
      expenseDate: new Date('2026-06-30T17:00:00.000Z'),
      category: 'SEWA_TRUK',
      amount: 350000,
      photoPath: null,
      note: null,
      kapling: { name: 'Blok A' },
    })

    const res = await createExpense(
      null,
      fd({ kaplingId: 'k1', expenseDate: '2026-07-01', category: 'SEWA_TRUK', amount: '350000' }),
    )
    expect(res.ok).toBe(true)
    expect(notifyMock.notifyExpenseCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'SEWA_TRUK',
        categoryLabel: 'Sewa Truk',
      }),
    )
  })

  it('actionError menyembunyikan detail Prisma P2002 pada createKapling', async () => {
    const prismaErr = Object.assign(new Error('Unique constraint failed on the fields: (`name`)'), {
      code: 'P2002',
    })
    prismaMock.kapling.create.mockRejectedValueOnce(prismaErr)
    const res = await createKapling(null, fd({ name: 'Blok A' }))
    expect(res).toEqual({ ok: false, message: 'Nama kapling sudah digunakan.' })
  })
})
