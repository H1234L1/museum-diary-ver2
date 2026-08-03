const storage = require('./storage-adapter')

const TRACKING_STORAGE_KEY = 'museum:tracking:v1'
let sessionStartedAt = null

const pad = (value) => String(value).padStart(2, '0')
const getMonthKey = (value = Date.now()) => {
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}
const getDayKey = (value = Date.now()) => {
  const date = new Date(value)
  return `${getMonthKey(date)}-${pad(date.getDate())}`
}

const normalizeMonth = (month) => ({
  activeMs: Math.max(0, Number(month && month.activeMs) || 0),
  visitDays: month && typeof month.visitDays === 'object' ? month.visitDays : {},
  lastEnterAt: Math.max(0, Number(month && month.lastEnterAt) || 0),
  lastExitAt: Math.max(0, Number(month && month.lastExitAt) || 0)
})

const normalizeTracking = (tracking) => {
  const months = Object.keys(tracking && tracking.months || {}).reduce((result, monthKey) => {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
      result[monthKey] = normalizeMonth(tracking.months[monthKey])
    }
    return result
  }, {})
  return { version: 1, months }
}

const getTracking = async () => {
  return normalizeTracking(await storage.get(TRACKING_STORAGE_KEY))
}

const saveTracking = async (tracking) => {
  const normalized = normalizeTracking(tracking)
  await storage.set(TRACKING_STORAGE_KEY, normalized)
  return normalized
}

const ensureMonth = (tracking, monthKey) => {
  if (!tracking.months[monthKey]) tracking.months[monthKey] = normalizeMonth()
  return tracking.months[monthKey]
}

const markVisitDays = (tracking, startedAt, endedAt) => {
  const cursor = new Date(startedAt)
  cursor.setHours(0, 0, 0, 0)
  const finalDay = new Date(Math.max(startedAt, endedAt - 1))
  finalDay.setHours(0, 0, 0, 0)

  while (cursor <= finalDay) {
    const timestamp = cursor.getTime()
    const month = ensureMonth(tracking, getMonthKey(timestamp))
    month.visitDays[getDayKey(timestamp)] = true
    cursor.setDate(cursor.getDate() + 1)
  }
}

const addActiveInterval = (tracking, startedAt, endedAt) => {
  let cursor = startedAt
  while (cursor < endedAt) {
    const cursorDate = new Date(cursor)
    const nextMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 1).getTime()
    const segmentEnd = Math.min(endedAt, nextMonth)
    const month = ensureMonth(tracking, getMonthKey(cursor))
    month.activeMs += segmentEnd - cursor
    cursor = segmentEnd
  }
}

const startAppSession = async (startedAt = Date.now()) => {
  if (sessionStartedAt !== null) return
  sessionStartedAt = startedAt

  const tracking = await getTracking()
  const month = ensureMonth(tracking, getMonthKey(startedAt))
  month.visitDays[getDayKey(startedAt)] = true
  month.lastEnterAt = Math.max(month.lastEnterAt, startedAt)
  await saveTracking(tracking)
}

const endAppSession = async (endedAt = Date.now()) => {
  if (sessionStartedAt === null) return

  const startedAt = sessionStartedAt
  sessionStartedAt = null
  if (endedAt <= startedAt) return

  const tracking = await getTracking()
  markVisitDays(tracking, startedAt, endedAt)
  addActiveInterval(tracking, startedAt, endedAt)
  const exitMonth = ensureMonth(tracking, getMonthKey(endedAt))
  exitMonth.lastExitAt = Math.max(exitMonth.lastExitAt, endedAt)
  await saveTracking(tracking)
}

const getMonthBounds = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number)
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 1).getTime()
  }
}

const getMonthlyTracking = async (monthKey, now = Date.now()) => {
  const tracking = await getTracking()
  const month = normalizeMonth(tracking.months[monthKey])
  const visitDayKeys = new Set(Object.keys(month.visitDays))

  if (sessionStartedAt !== null && now > sessionStartedAt) {
    const bounds = getMonthBounds(monthKey)
    const overlapStart = Math.max(sessionStartedAt, bounds.start)
    const overlapEnd = Math.min(now, bounds.end)
    if (overlapEnd > overlapStart) {
      month.activeMs += overlapEnd - overlapStart
      const cursor = new Date(overlapStart)
      cursor.setHours(0, 0, 0, 0)
      const finalDay = new Date(overlapEnd - 1)
      finalDay.setHours(0, 0, 0, 0)
      while (cursor <= finalDay) {
        visitDayKeys.add(getDayKey(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }
  }

  return {
    activeMs: month.activeMs,
    visitDays: visitDayKeys.size,
    lastEnterAt: month.lastEnterAt || null,
    lastExitAt: month.lastExitAt || null
  }
}

module.exports = {
  TRACKING_STORAGE_KEY,
  startAppSession,
  endAppSession,
  getMonthlyTracking
}
