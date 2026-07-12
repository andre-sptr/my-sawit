const appTimeZone = 'Asia/Jakarta'
const jakartaOffsetHours = 7

export function getCurrentMonthRange(now = new Date()) {
  const { year, month } = getJakartaDateParts(now)
  // Jakarta = UTC+7: awal bulan 00:00 WIB = hari-sebelumnya 17:00 UTC
  const start = new Date(Date.UTC(year, month - 1, 1) - jakartaOffsetHours * 60 * 60 * 1000)
  const end   = new Date(Date.UTC(year, month,     1) - jakartaOffsetHours * 60 * 60 * 1000)

  return { start, end }
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

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatKg(value: number) {
  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(value)} kg`
}

function getJakartaDateParts(date: Date) {
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
