const appTimeZone = 'Asia/Jakarta'
const jakartaOffsetHours = 7

export function getMonthRange(year: number, month: number) {
  // Jakarta = UTC+7: awal bulan 00:00 WIB = hari-sebelumnya 17:00 UTC
  const start = new Date(Date.UTC(year, month - 1, 1) - jakartaOffsetHours * 60 * 60 * 1000)
  const end = new Date(Date.UTC(year, month, 1) - jakartaOffsetHours * 60 * 60 * 1000)
  return { start, end }
}

export function getCurrentMonthRange(now = new Date()) {
  const { year, month } = getJakartaDateParts(now)
  return getMonthRange(year, month)
}

export function getTodayRange(now = new Date()) {
  const { year, month, day } = getJakartaDateParts(now)
  const start = new Date(Date.UTC(year, month - 1, day, -jakartaOffsetHours))
  const end = new Date(Date.UTC(year, month - 1, day + 1, -jakartaOffsetHours))
  return { start, end }
}

export function getThisWeekRange(now = new Date()) {
  // Minggu Senin–Minggu (ISO). weekday: 0=Minggu, 1=Senin...
  const { year, month, day } = getJakartaDateParts(now)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  const start = new Date(Date.UTC(year, month - 1, day - daysSinceMonday, -jakartaOffsetHours))
  const end = new Date(Date.UTC(year, month - 1, day - daysSinceMonday + 7, -jakartaOffsetHours))
  return { start, end }
}

export function getThisMonthRange(now = new Date()) {
  return getCurrentMonthRange(now)
}

export function parseJakartaDateInput(raw: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!match) {
    throw new Error('Format tanggal tidak valid.')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error('Tanggal tidak valid.')
  }
  const value = new Date(Date.UTC(year, month - 1, day, -jakartaOffsetHours))
  if (Number.isNaN(value.getTime())) {
    throw new Error('Tanggal tidak valid.')
  }
  const roundTrip = getJakartaDateParts(value)
  if (roundTrip.year !== year || roundTrip.month !== month || roundTrip.day !== day) {
    throw new Error('Tanggal tidak valid.')
  }
  return value
}

// Jam saat ini menurut zona waktu Jakarta (0–23), independen dari TZ server.
export function getJakartaHour(now = new Date()) {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: appTimeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now)

  return Number(hour)
}

// Format tanggal/waktu "sekarang" selalu memakai zona Jakarta, bukan TZ server.
export function formatJakartaNow(options: Intl.DateTimeFormatOptions, now = new Date()) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: appTimeZone, ...options }).format(now)
}

export function toDateInputValue(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date
  const { year, month, day } = getJakartaDateParts(value)

  return `${year}-${padDatePart(month)}-${padDatePart(day)}`
}

export function getJakartaYearMonthKey(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date
  const { year, month } = getJakartaDateParts(value)
  return `${year}-${padDatePart(month)}`
}

export function formatJakartaMonthYear(year: number, month: number) {
  return formatJakartaNow({ month: 'long', year: 'numeric' }, new Date(Date.UTC(year, month - 1, 15)))
}

export function formatDate(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: appTimeZone,
  }).format(value)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyCompact(value: number) {
  return formatCurrency(value).replace(/\s+/g, '')
}

export function formatKg(value: number) {
  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(value)} kg`
}

export function getJakartaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(getDatePart(parts, 'year')),
    month: Number(getDatePart(parts, 'month')),
    day: Number(getDatePart(parts, 'day')),
  }
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const part = parts.find((item) => item.type === type)

  if (!part) {
    throw new Error(`Missing ${type} date part`)
  }

  return part.value
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0')
}
