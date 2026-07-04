export type DropdownItem = {
  value: string
  label: string
}

// Default built-in options (always available even if DB is empty)
export const defaultMaintenanceTypes: DropdownItem[] = [
  { value: 'SEMPROT', label: 'Semprot' },
  { value: 'BABAT', label: 'Babat' },
  { value: 'PUPUK', label: 'Pupuk' },
]

export const defaultExpenseCategories: DropdownItem[] = [
  { value: 'GAJI_KARYAWAN', label: 'Gaji karyawan' },
  { value: 'LAIN_LAIN', label: 'Lain-lain' },
]

// Keep backward-compat aliases used by forms.tsx and history-lists.tsx
export const maintenanceTypes = defaultMaintenanceTypes
export const expenseCategories = defaultExpenseCategories

/** Merge default options with custom DB options. DB options that match a default value use the default label. */
export function mergeOptions(defaults: DropdownItem[], dbOptions: DropdownItem[]): DropdownItem[] {
  const seen = new Set<string>()
  const result: DropdownItem[] = []
  // defaults first
  for (const d of defaults) {
    seen.add(d.value)
    result.push(d)
  }
  // then custom DB entries
  for (const o of dbOptions) {
    if (!seen.has(o.value)) {
      seen.add(o.value)
      result.push(o)
    }
  }
  return result
}

/** Get label for a given value from a list. Falls back to the raw value. */
export function getLabel(options: DropdownItem[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value
}

export type Summary = {
  totalHarvestKg: number
  totalRevenue: number
  totalDirectExpenses: number
  totalMaintenanceExpenses: number
  totalExpenses: number
  netProfit: number
}

export type ActionResult = {
  ok: boolean
  message: string
}
