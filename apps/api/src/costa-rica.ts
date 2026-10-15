export const COSTA_RICA = 'America/Costa_Rica'

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
const WINDOWS: Record<string, { days: number; label: string }> = {
  today: { days: 0, label: 'Hoy' },
  week: { days: 6, label: 'Últimos 7 días' },
  month: { days: 29, label: 'Últimos 30 días' },
  quarter: { days: 89, label: 'Últimos 90 días' },
}

export type SalesWindow = {
  id: string
  label: string
  start: Date
  end: Date
  text: string
}

export function salesWindow(range: string | undefined, now = new Date()): SalesWindow | null {
  const chosen = WINDOWS[range || '']
  if (!chosen) return null
  const today = costaRicaCalendar(now)
  const startDay = addDays(today, -chosen.days)
  const start = costaRicaInstant(startDay.year, startDay.month, startDay.day)
  return {
    id: range as string,
    label: chosen.label,
    start,
    end: now,
    text: `Del ${formatCostaRica(start)} al ${formatCostaRica(now)}, hora de Costa Rica.`,
  }
}

export function costaRicaDays(from: string, to: string, now = new Date()) {
  const startKey = from || costaRicaKey(now)
  const endKey = to || startKey
  const start = parseDay(startKey)
  const end = parseDay(endKey)
  if (!start || !end) return null
  const next = addDays(end, 1)
  const finish = costaRicaInstant(next.year, next.month, next.day)
  const begin = costaRicaInstant(start.year, start.month, start.day)
  if (begin.getTime() >= finish.getTime()) return null
  return { start: begin, end: finish }
}

export function costaRicaInstant(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second)
  let utc = desired
  for (let pass = 0; pass < 2; pass += 1) utc = desired - zoneOffsetMs(new Date(utc))
  return new Date(utc)
}

function costaRicaKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: COSTA_RICA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function costaRicaCalendar(date: Date) {
  const [year, month, day] = costaRicaKey(date).split('-').map(Number)
  return { year, month, day }
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days))
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() }
}

function parseDay(value: string) {
  const match = DAY.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const instant = costaRicaInstant(year, month, day)
  if (costaRicaKey(instant) !== value) return null
  return { year, month, day }
}

function formatCostaRica(date: Date) {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: COSTA_RICA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function zoneOffsetMs(instant: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: COSTA_RICA,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const read = (type: Intl.DateTimeFormatPart['type']) => Number(parts.find((part) => part.type === type)?.value)
  let year = read('year')
  let month = read('month')
  let day = read('day')
  let hour = read('hour')
  const minute = read('minute')
  const second = read('second')
  if (hour === 24) {
    hour = 0
    const next = new Date(Date.UTC(year, month - 1, day + 1))
    year = next.getUTCFullYear()
    month = next.getUTCMonth() + 1
    day = next.getUTCDate()
  }
  return Date.UTC(year, month - 1, day, hour, minute, second) - instant.getTime()
}
