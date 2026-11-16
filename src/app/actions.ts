'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { parseJakartaDateInput } from '@/lib/date'
import { prisma } from '@/lib/prisma'
import {
  defaultExpenseCategories,
  defaultMaintenanceTypes,
  type ActionResult,
} from '@/lib/types'
import { deleteUploadedPhoto, saveOptionalPhoto } from '@/lib/uploads'

import {
  notifyExpenseCreated,
  notifyExpenseDeleted,
  notifyExpenseUpdated,
  notifyHarvestCreated,
  notifyHarvestDeleted,
  notifyHarvestUpdated,
  notifyMaintenanceCreated,
  notifyMaintenanceDeleted,
  notifyMaintenanceUpdated,
  notifySaleCreated,
  notifySaleDeleted,
  notifySaleUpdated,
} from '@/lib/notify'

const MAX_NAME_LENGTH = 100
const MAX_LABEL_LENGTH = 60
const MAX_NOTE_LENGTH = 1000
const MAX_NUMERIC_VALUE = 1_000_000_000_000
const ALLOWED_DROPDOWN_GROUPS = new Set(['maintenanceType', 'expenseCategory'])

class UserFacingError extends Error {}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function requiredText(formData: FormData, key: string, label: string, maxLen?: number) {
  const value = text(formData, key)
  if (!value) throw new UserFacingError(`${label} wajib diisi.`)
  if (maxLen != null && value.length > maxLen) {
    throw new UserFacingError(`${label} maksimal ${maxLen} karakter.`)
  }
  return value
}

function optionalNote(formData: FormData) {
  const value = text(formData, 'note')
  if (!value) return null
  if (value.length > MAX_NOTE_LENGTH) {
    throw new UserFacingError(`Catatan maksimal ${MAX_NOTE_LENGTH} karakter.`)
  }
  return value
}

function requiredNumber(formData: FormData, key: string, label: string) {
  const raw = text(formData, key)
  const value = Number(raw)
  if (!raw || !Number.isFinite(value) || value <= 0) {
    throw new UserFacingError(`${label} harus lebih dari 0.`)
  }
  if (value > MAX_NUMERIC_VALUE) {
    throw new UserFacingError(`${label} terlalu besar.`)
  }
  return value
}

function optionalNumber(formData: FormData, key: string, label: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw new UserFacingError(`${label} tidak boleh negatif.`)
  }
  if (value > MAX_NUMERIC_VALUE) {
    throw new UserFacingError(`${label} terlalu besar.`)
  }
  return value
}

function requiredDate(formData: FormData, key: string, label: string) {
  const raw = requiredText(formData, key, label)
  try {
    return parseJakartaDateInput(raw)
  } catch {
    throw new UserFacingError(`${label} tidak valid.`)
  }
}

function getPrismaErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return null
}

function actionError(error: unknown, duplicateMessage?: string): ActionResult {
  const code = getPrismaErrorCode(error)
  if (code === 'P2002') {
    return { ok: false, message: duplicateMessage ?? 'Data sudah ada (duplikat).' }
  }
  if (code === 'P2025') {
    return { ok: false, message: 'Data tidak ditemukan.' }
  }
  if (code === 'P2003') {
    return { ok: false, message: 'Data masih terhubung atau referensi tidak valid.' }
  }

  if (error instanceof UserFacingError) {
    return { ok: false, message: error.message }
  }

  if (error instanceof Error) {
    // Izinkan pesan validasi dari auth/uploads/date; cegah bocornya error internal Prisma/SQLite/FS.
    const msg = error.message
    const isInternal =
      error.name.startsWith('Prisma') ||
      /SQLITE|ENOENT|EACCES|EPERM|Unique constraint|Foreign key/i.test(msg)
    if (!isInternal && msg) {
      return { ok: false, message: msg }
    }
  }

  return { ok: false, message: 'Terjadi kesalahan pada server.' }
}

function revalidateKaplingPages(kaplingId?: string) {
  revalidatePath('/')
  if (kaplingId) {
    revalidatePath(`/kapling/${kaplingId}`)
  }
}

async function requireActiveKapling(kaplingId: string) {
  const kapling = await prisma.kapling.findUnique({
    where: { id: kaplingId },
    select: { id: true, name: true, isActive: true },
  })
  if (!kapling) {
    throw new UserFacingError('Kapling tidak ditemukan.')
  }
  if (!kapling.isActive) {
    throw new UserFacingError('Kapling nonaktif tidak dapat menerima atau mengubah aktivitas.')
  }
  return kapling
}

async function resolveOptionLabel(
  group: 'maintenanceType' | 'expenseCategory',
  value: string,
): Promise<string> {
  const defaults = group === 'maintenanceType' ? defaultMaintenanceTypes : defaultExpenseCategories
  const builtIn = defaults.find((d) => d.value === value)
  if (builtIn) return builtIn.label
  const rows = await prisma.dropdownOption.findMany({
    where: { group },
    select: { value: true, label: true },
  })
  return rows.find((r) => r.value === value)?.label ?? value
}

async function updatePhotoState(
  formData: FormData,
  existingPhotoPath: string | null,
): Promise<{ nextPhotoData: { photoPath?: string | null }; uploadedPhotoPath: string | null; oldToDelete: string | null }> {
  const uploadedPhotoPath = await saveOptionalPhoto(formData)
  const removePhoto = text(formData, 'removePhoto') === '1'
  if (uploadedPhotoPath) {
    return {
      nextPhotoData: { photoPath: uploadedPhotoPath },
      uploadedPhotoPath,
      oldToDelete: existingPhotoPath,
    }
  }
  if (removePhoto) {
    return {
      nextPhotoData: { photoPath: null },
      uploadedPhotoPath: null,
      oldToDelete: existingPhotoPath,
    }
  }
  return {
    nextPhotoData: {},
    uploadedPhotoPath: null,
    oldToDelete: null,
  }
}

export async function createKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    await prisma.kapling.create({
      data: { name: requiredText(formData, 'name', 'Nama kapling', MAX_NAME_LENGTH) },
    })
    revalidateKaplingPages()
    return { ok: true, message: 'Kapling berhasil ditambahkan.' }
  } catch (error) {
    return actionError(error, 'Nama kapling sudah digunakan.')
  }
}

export async function updateKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Kapling')
    const name = requiredText(formData, 'name', 'Nama kapling', MAX_NAME_LENGTH)
    await prisma.kapling.update({
      where: { id },
      data: { name },
    })
    revalidateKaplingPages(id)
    return { ok: true, message: 'Kapling berhasil diubah.' }
  } catch (error) {
    return actionError(error, 'Nama kapling sudah digunakan.')
  }
}

export async function deactivateKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Kapling')
    await prisma.kapling.update({
      where: { id },
      data: { isActive: false },
    })
    revalidateKaplingPages(id)
    return { ok: true, message: 'Kapling dinonaktifkan.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function reactivateKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Kapling')
    await prisma.kapling.update({
      where: { id },
      data: { isActive: true },
    })
    revalidateKaplingPages(id)
    return { ok: true, message: 'Kapling berhasil diaktifkan kembali.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteKaplingPermanent(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Kapling')
    const [harvestPhotos, maintenancePhotos, expensePhotos, salePhotos] = await Promise.all([
      prisma.harvest.findMany({ where: { kaplingId: id }, select: { photoPath: true } }),
      prisma.maintenance.findMany({ where: { kaplingId: id }, select: { photoPath: true } }),
      prisma.expense.findMany({ where: { kaplingId: id }, select: { photoPath: true } }),
      prisma.sale.findMany({ where: { kaplingId: id }, select: { photoPath: true } }),
    ])

    // Hapus semua data terkait dulu (schema: onDelete: Restrict)
    await prisma.$transaction([
      prisma.harvest.deleteMany({ where: { kaplingId: id } }),
      prisma.maintenance.deleteMany({ where: { kaplingId: id } }),
      prisma.expense.deleteMany({ where: { kaplingId: id } }),
      prisma.sale.deleteMany({ where: { kaplingId: id } }),
      prisma.kapling.delete({ where: { id } }),
    ])

    const allPhotoPaths = [
      ...harvestPhotos,
      ...maintenancePhotos,
      ...expensePhotos,
      ...salePhotos,
    ].map((item) => item.photoPath)
    await Promise.all(allPhotoPaths.map((p) => deleteUploadedPhoto(p)))

    revalidatePath('/')
    return { ok: true, message: 'Kapling dan semua datanya telah dihapus permanen.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createHarvest(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const harvestDate = requiredDate(formData, 'harvestDate', 'Tanggal panen')
    const weightKg = requiredNumber(formData, 'weightKg', 'Berat panen')
    const note = optionalNote(formData)
    await requireActiveKapling(kaplingId)

    uploadedPhotoPath = await saveOptionalPhoto(formData)
    const harvest = await prisma.harvest.create({
      data: { kaplingId, harvestDate, weightKg, photoPath: uploadedPhotoPath, note },
      include: { kapling: { select: { name: true } } },
    })
    await notifyHarvestCreated({
      kaplingName: harvest.kapling.name,
      harvestDate: harvest.harvestDate,
      weightKg: harvest.weightKg,
      note: harvest.note,
      photoPath: harvest.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Panenan berhasil disimpan.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function updateHarvest(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Panenan')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const harvestDate = requiredDate(formData, 'harvestDate', 'Tanggal panen')
    const weightKg = requiredNumber(formData, 'weightKg', 'Berat panen')
    const note = optionalNote(formData)

    const existing = await prisma.harvest.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { isActive: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')
    if (!existing.kapling.isActive) {
      throw new UserFacingError('Kapling nonaktif tidak dapat menerima atau mengubah aktivitas.')
    }

    const photoUpdate = await updatePhotoState(formData, existing.photoPath)
    uploadedPhotoPath = photoUpdate.uploadedPhotoPath

    const harvest = await prisma.harvest.update({
      where: { id },
      data: { harvestDate, weightKg, ...photoUpdate.nextPhotoData, note },
      include: { kapling: { select: { name: true } } },
    })
    await deleteUploadedPhoto(photoUpdate.oldToDelete)

    await notifyHarvestUpdated({
      kaplingName: harvest.kapling.name,
      harvestDate: harvest.harvestDate,
      weightKg: harvest.weightKg,
      note: harvest.note,
      photoPath: harvest.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Panenan berhasil diubah.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function deleteHarvest(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Panenan')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const existing = await prisma.harvest.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { name: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')

    await prisma.harvest.delete({ where: { id } })
    await deleteUploadedPhoto(existing.photoPath)

    await notifyHarvestDeleted({
      kaplingName: existing.kapling.name,
      harvestDate: existing.harvestDate,
      weightKg: existing.weightKg,
      note: existing.note,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Panenan berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const activityDate = requiredDate(formData, 'activityDate', 'Tanggal perawatan')
    const type = requiredText(formData, 'type', 'Jenis perawatan', MAX_LABEL_LENGTH)
    const cost = optionalNumber(formData, 'cost', 'Biaya perawatan')
    const note = optionalNote(formData)
    await requireActiveKapling(kaplingId)

    uploadedPhotoPath = await saveOptionalPhoto(formData)
    const maintenance = await prisma.maintenance.create({
      data: { kaplingId, activityDate, type, cost, photoPath: uploadedPhotoPath, note },
      include: { kapling: { select: { name: true } } },
    })
    const typeLabel = await resolveOptionLabel('maintenanceType', maintenance.type)
    await notifyMaintenanceCreated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      typeLabel,
      cost: maintenance.cost,
      photoPath: maintenance.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Perawatan berhasil disimpan.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function updateMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Perawatan')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const activityDate = requiredDate(formData, 'activityDate', 'Tanggal perawatan')
    const type = requiredText(formData, 'type', 'Jenis perawatan', MAX_LABEL_LENGTH)
    const cost = optionalNumber(formData, 'cost', 'Biaya perawatan')
    const note = optionalNote(formData)

    const existing = await prisma.maintenance.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { isActive: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')
    if (!existing.kapling.isActive) {
      throw new UserFacingError('Kapling nonaktif tidak dapat menerima atau mengubah aktivitas.')
    }

    const photoUpdate = await updatePhotoState(formData, existing.photoPath)
    uploadedPhotoPath = photoUpdate.uploadedPhotoPath

    const maintenance = await prisma.maintenance.update({
      where: { id },
      data: { activityDate, type, cost, ...photoUpdate.nextPhotoData, note },
      include: { kapling: { select: { name: true } } },
    })
    await deleteUploadedPhoto(photoUpdate.oldToDelete)

    const typeLabel = await resolveOptionLabel('maintenanceType', maintenance.type)
    await notifyMaintenanceUpdated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      typeLabel,
      cost: maintenance.cost,
      photoPath: maintenance.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Perawatan berhasil diubah.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function deleteMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Perawatan')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const existing = await prisma.maintenance.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { name: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')

    await prisma.maintenance.delete({ where: { id } })
    await deleteUploadedPhoto(existing.photoPath)

    const typeLabel = await resolveOptionLabel('maintenanceType', existing.type)
    await notifyMaintenanceDeleted({
      kaplingName: existing.kapling.name,
      activityDate: existing.activityDate,
      type: existing.type,
      typeLabel,
      cost: existing.cost,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Perawatan berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const expenseDate = requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran')
    const category = requiredText(formData, 'category', 'Kategori', MAX_LABEL_LENGTH)
    const amount = requiredNumber(formData, 'amount', 'Nominal')
    const note = optionalNote(formData)
    await requireActiveKapling(kaplingId)

    uploadedPhotoPath = await saveOptionalPhoto(formData)
    const expense = await prisma.expense.create({
      data: { kaplingId, expenseDate, category, amount, photoPath: uploadedPhotoPath, note },
      include: { kapling: { select: { name: true } } },
    })
    const categoryLabel = await resolveOptionLabel('expenseCategory', expense.category)
    await notifyExpenseCreated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      categoryLabel,
      amount: expense.amount,
      photoPath: expense.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Pengeluaran berhasil disimpan.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function updateExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Pengeluaran')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const expenseDate = requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran')
    const category = requiredText(formData, 'category', 'Kategori', MAX_LABEL_LENGTH)
    const amount = requiredNumber(formData, 'amount', 'Nominal')
    const note = optionalNote(formData)

    const existing = await prisma.expense.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { isActive: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')
    if (!existing.kapling.isActive) {
      throw new UserFacingError('Kapling nonaktif tidak dapat menerima atau mengubah aktivitas.')
    }

    const photoUpdate = await updatePhotoState(formData, existing.photoPath)
    uploadedPhotoPath = photoUpdate.uploadedPhotoPath

    const expense = await prisma.expense.update({
      where: { id },
      data: { expenseDate, category, amount, ...photoUpdate.nextPhotoData, note },
      include: { kapling: { select: { name: true } } },
    })
    await deleteUploadedPhoto(photoUpdate.oldToDelete)

    const categoryLabel = await resolveOptionLabel('expenseCategory', expense.category)
    await notifyExpenseUpdated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      categoryLabel,
      amount: expense.amount,
      photoPath: expense.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Pengeluaran berhasil diubah.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function deleteExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Pengeluaran')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const existing = await prisma.expense.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { name: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')

    await prisma.expense.delete({ where: { id } })
    await deleteUploadedPhoto(existing.photoPath)

    const categoryLabel = await resolveOptionLabel('expenseCategory', existing.category)
    await notifyExpenseDeleted({
      kaplingName: existing.kapling.name,
      expenseDate: existing.expenseDate,
      category: existing.category,
      categoryLabel,
      amount: existing.amount,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Pengeluaran berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const saleDate = requiredDate(formData, 'saleDate', 'Tanggal penjualan')
    const weightKg = requiredNumber(formData, 'weightKg', 'Berat jual')
    const pricePerKg = requiredNumber(formData, 'pricePerKg', 'Harga per kg')
    const note = optionalNote(formData)
    await requireActiveKapling(kaplingId)

    uploadedPhotoPath = await saveOptionalPhoto(formData)
    const sale = await prisma.sale.create({
      data: { kaplingId, saleDate, weightKg, pricePerKg, photoPath: uploadedPhotoPath, note },
      include: { kapling: { select: { name: true } } },
    })
    await notifySaleCreated({
      id: sale.id,
      kaplingName: sale.kapling.name,
      saleDate: sale.saleDate,
      weightKg: sale.weightKg,
      pricePerKg: sale.pricePerKg,
      note: sale.note,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Hasil panen berhasil disimpan.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function updateSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let uploadedPhotoPath: string | null = null
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Hasil panen')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const saleDate = requiredDate(formData, 'saleDate', 'Tanggal penjualan')
    const weightKg = requiredNumber(formData, 'weightKg', 'Berat jual')
    const pricePerKg = requiredNumber(formData, 'pricePerKg', 'Harga per kg')
    const note = optionalNote(formData)

    const existing = await prisma.sale.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { isActive: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')
    if (!existing.kapling.isActive) {
      throw new UserFacingError('Kapling nonaktif tidak dapat menerima atau mengubah aktivitas.')
    }

    const photoUpdate = await updatePhotoState(formData, existing.photoPath)
    uploadedPhotoPath = photoUpdate.uploadedPhotoPath

    const sale = await prisma.sale.update({
      where: { id },
      data: { saleDate, weightKg, pricePerKg, ...photoUpdate.nextPhotoData, note },
      include: { kapling: { select: { name: true } } },
    })
    await deleteUploadedPhoto(photoUpdate.oldToDelete)

    await notifySaleUpdated({
      id: sale.id,
      kaplingName: sale.kapling.name,
      saleDate: sale.saleDate,
      weightKg: sale.weightKg,
      pricePerKg: sale.pricePerKg,
      note: sale.note,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Hasil panen berhasil diubah.' }
  } catch (error) {
    await deleteUploadedPhoto(uploadedPhotoPath)
    return actionError(error)
  }
}

export async function addDropdownOption(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const group = requiredText(formData, 'group', 'Group')
    if (!ALLOWED_DROPDOWN_GROUPS.has(group)) {
      throw new UserFacingError('Grup opsi tidak valid.')
    }
    const label = requiredText(formData, 'label', 'Label', MAX_LABEL_LENGTH)
    const kaplingId = text(formData, 'kaplingId')
    // Generate a value key from the label: uppercase, spaces to underscores
    const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!value) throw new UserFacingError('Label harus mengandung huruf atau angka.')
    const maxSort = await prisma.dropdownOption.aggregate({
      where: { group },
      _max: { sortOrder: true },
    })
    await prisma.dropdownOption.create({
      data: {
        group,
        value,
        label,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    })
    revalidateKaplingPages(kaplingId || undefined)
    revalidatePath('/kapling/[id]', 'page')
    return { ok: true, message: `"${label}" berhasil ditambahkan.` }
  } catch (error) {
    return actionError(error, 'Opsi ini sudah ada.')
  }
}

export async function deleteSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAuth()
    const id = requiredText(formData, 'id', 'Hasil panen')
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const existing = await prisma.sale.findFirst({
      where: { id, kaplingId },
      include: { kapling: { select: { name: true } } },
    })
    if (!existing) throw new UserFacingError('Data tidak ditemukan.')

    await prisma.sale.delete({ where: { id } })
    await deleteUploadedPhoto(existing.photoPath)

    await notifySaleDeleted({
      id: existing.id,
      kaplingName: existing.kapling.name,
      saleDate: existing.saleDate,
      weightKg: existing.weightKg,
      pricePerKg: existing.pricePerKg,
      note: existing.note,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Hasil panen berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}
