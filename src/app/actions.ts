'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { saveOptionalPhoto } from '@/lib/uploads'
import type { ActionResult } from '@/lib/types'

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

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function requiredText(formData: FormData, key: string, label: string) {
  const value = text(formData, key)
  if (!value) throw new Error(`${label} wajib diisi.`)
  return value
}

function requiredNumber(formData: FormData, key: string, label: string) {
  const value = Number(text(formData, key))
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} harus lebih dari 0.`)
  }
  return value
}

function optionalNumber(formData: FormData, key: string, label: string) {
  const raw = text(formData, key)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} tidak boleh negatif.`)
  }
  return value
}

function requiredDate(formData: FormData, key: string, label: string) {
  const raw = requiredText(formData, key, label)
  const value = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(value.getTime())) throw new Error(`${label} tidak valid.`)
  return value
}

function actionError(error: unknown): ActionResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : 'Terjadi kesalahan.',
  }
}

function revalidateKaplingPages(kaplingId?: string) {
  revalidatePath('/')
  if (kaplingId) {
    revalidatePath(`/kapling/${kaplingId}`)
  }
}

export async function createKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await prisma.kapling.create({
      data: { name: requiredText(formData, 'name', 'Nama kapling') },
    })
    revalidateKaplingPages()
    return { ok: true, message: 'Kapling berhasil ditambahkan.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Kapling')
    await prisma.kapling.update({
      where: { id },
      data: { name: requiredText(formData, 'name', 'Nama kapling') },
    })
    revalidateKaplingPages(id)
    return { ok: true, message: 'Kapling berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function deactivateKapling(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
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
    const id = requiredText(formData, 'id', 'Kapling')
    // Hapus semua data terkait dulu (schema: onDelete: Restrict)
    await prisma.$transaction([
      prisma.harvest.deleteMany({ where: { kaplingId: id } }),
      prisma.maintenance.deleteMany({ where: { kaplingId: id } }),
      prisma.expense.deleteMany({ where: { kaplingId: id } }),
      prisma.sale.deleteMany({ where: { kaplingId: id } }),
      prisma.kapling.delete({ where: { id } }),
    ])
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
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const harvest = await prisma.harvest.create({
      data: {
        kaplingId,
        harvestDate: requiredDate(formData, 'harvestDate', 'Tanggal panen'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat panen'),
        photoPath,
        note: text(formData, 'note') || null,
      },
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
    return actionError(error)
  }
}

export async function updateHarvest(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const harvest = await prisma.harvest.update({
      where: { id: requiredText(formData, 'id', 'Panenan') },
      data: {
        harvestDate: requiredDate(formData, 'harvestDate', 'Tanggal panen'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat panen'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyHarvestUpdated({
      kaplingName: harvest.kapling.name,
      harvestDate: harvest.harvestDate,
      weightKg: harvest.weightKg,
      note: harvest.note,
      photoPath: harvest.photoPath,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Panenan berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteHarvest(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Panenan')
    // Read before delete so notify can include record details in the deletion message.
    const existing = await prisma.harvest.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.harvest.delete({ where: { id } })
    if (existing) {
      await notifyHarvestDeleted({
        kaplingName: existing.kapling.name,
        harvestDate: existing.harvestDate,
        weightKg: existing.weightKg,
        note: existing.note,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Panenan berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const maintenance = await prisma.maintenance.create({
      data: {
        kaplingId,
        activityDate: requiredDate(formData, 'activityDate', 'Tanggal perawatan'),
        type: requiredText(formData, 'type', 'Jenis perawatan'),
        cost: optionalNumber(formData, 'cost', 'Biaya perawatan'),
        photoPath,
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyMaintenanceCreated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      cost: maintenance.cost,
      photoPath: maintenance.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Perawatan berhasil disimpan.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const maintenance = await prisma.maintenance.update({
      where: { id: requiredText(formData, 'id', 'Perawatan') },
      data: {
        activityDate: requiredDate(formData, 'activityDate', 'Tanggal perawatan'),
        type: requiredText(formData, 'type', 'Jenis perawatan'),
        cost: optionalNumber(formData, 'cost', 'Biaya perawatan'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyMaintenanceUpdated({
      kaplingName: maintenance.kapling.name,
      activityDate: maintenance.activityDate,
      type: maintenance.type,
      cost: maintenance.cost,
      photoPath: maintenance.photoPath,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Perawatan berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteMaintenance(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Perawatan')
    // Read before delete so notify can include record details in the deletion message.
    const existing = await prisma.maintenance.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.maintenance.delete({ where: { id } })
    if (existing) {
      await notifyMaintenanceDeleted({
        kaplingName: existing.kapling.name,
        activityDate: existing.activityDate,
        type: existing.type,
        cost: existing.cost,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Perawatan berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const expense = await prisma.expense.create({
      data: {
        kaplingId,
        expenseDate: requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran'),
        category: requiredText(formData, 'category', 'Kategori'),
        amount: requiredNumber(formData, 'amount', 'Nominal'),
        photoPath,
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyExpenseCreated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
      photoPath: expense.photoPath,
    })
    revalidateKaplingPages(kaplingId)
    return { ok: true, message: 'Pengeluaran berhasil disimpan.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function updateExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const expense = await prisma.expense.update({
      where: { id: requiredText(formData, 'id', 'Pengeluaran') },
      data: {
        expenseDate: requiredDate(formData, 'expenseDate', 'Tanggal pengeluaran'),
        category: requiredText(formData, 'category', 'Kategori'),
        amount: requiredNumber(formData, 'amount', 'Nominal'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifyExpenseUpdated({
      kaplingName: expense.kapling.name,
      expenseDate: expense.expenseDate,
      category: expense.category,
      amount: expense.amount,
      photoPath: expense.photoPath,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Pengeluaran berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteExpense(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Pengeluaran')
    // Read before delete so notify can include record details in the deletion message.
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.expense.delete({ where: { id } })
    if (existing) {
      await notifyExpenseDeleted({
        kaplingName: existing.kapling.name,
        expenseDate: existing.expenseDate,
        category: existing.category,
        amount: existing.amount,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Pengeluaran berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function createSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const kaplingId = requiredText(formData, 'kaplingId', 'Kapling')
    const sale = await prisma.sale.create({
      data: {
        kaplingId,
        saleDate: requiredDate(formData, 'saleDate', 'Tanggal penjualan'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat jual'),
        pricePerKg: requiredNumber(formData, 'pricePerKg', 'Harga per kg'),
        photoPath,
        note: text(formData, 'note') || null,
      },
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
    return actionError(error)
  }
}

export async function updateSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const photoPath = await saveOptionalPhoto(formData)
    const sale = await prisma.sale.update({
      where: { id: requiredText(formData, 'id', 'Hasil panen') },
      data: {
        saleDate: requiredDate(formData, 'saleDate', 'Tanggal penjualan'),
        weightKg: requiredNumber(formData, 'weightKg', 'Berat jual'),
        pricePerKg: requiredNumber(formData, 'pricePerKg', 'Harga per kg'),
        ...(photoPath ? { photoPath } : {}),
        note: text(formData, 'note') || null,
      },
      include: { kapling: { select: { name: true } } },
    })
    await notifySaleUpdated({
      id: sale.id,
      kaplingName: sale.kapling.name,
      saleDate: sale.saleDate,
      weightKg: sale.weightKg,
      pricePerKg: sale.pricePerKg,
      note: sale.note,
    })
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Hasil panen berhasil diubah.' }
  } catch (error) {
    return actionError(error)
  }
}

export async function addDropdownOption(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const group = requiredText(formData, 'group', 'Group')
    const label = requiredText(formData, 'label', 'Label')
    // Generate a value key from the label: uppercase, spaces to underscores
    const value = label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (!value) throw new Error('Label tidak valid.')
    // Get the max sort order for the group
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
    revalidateKaplingPages()
    return { ok: true, message: `"${label}" berhasil ditambahkan.` }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return { ok: false, message: 'Opsi ini sudah ada.' }
    }
    return actionError(error)
  }
}

export async function deleteSale(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const id = requiredText(formData, 'id', 'Hasil panen')
    // Read before delete so notify can include record details in the deletion message.
    const existing = await prisma.sale.findUnique({
      where: { id },
      include: { kapling: { select: { name: true } } },
    })
    await prisma.sale.delete({ where: { id } })
    if (existing) {
      await notifySaleDeleted({
        id: existing.id,
        kaplingName: existing.kapling.name,
        saleDate: existing.saleDate,
        weightKg: existing.weightKg,
        pricePerKg: existing.pricePerKg,
        note: existing.note,
      })
    }
    revalidateKaplingPages(requiredText(formData, 'kaplingId', 'Kapling'))
    return { ok: true, message: 'Hasil panen berhasil dihapus.' }
  } catch (error) {
    return actionError(error)
  }
}
