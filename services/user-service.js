const storage = require('./storage-adapter')
const { TRACKING_STORAGE_KEY } = require('./tracking-service')

const USER_STORAGE_KEY = 'museum:user:v1'
const DAY_IN_MS = 24 * 60 * 60 * 1000

const normalizeUser = (user) => {
  if (!user || !user.createdAt) return null

  const normalizedUser = {
    createdAt: user.createdAt,
    items: Array.isArray(user.items) ? user.items : [],
    halls: Array.isArray(user.halls) ? user.halls : []
  }

  if (user.monthlyHighlights && typeof user.monthlyHighlights === 'object') {
    normalizedUser.monthlyHighlights = user.monthlyHighlights
  }

  return normalizedUser
}

const getUser = async () => {
  const storedUser = await storage.get(USER_STORAGE_KEY)
  return normalizeUser(storedUser)
}

const saveUser = async (user) => {
  const normalizedUser = normalizeUser(user)
  if (!normalizedUser) throw new Error('Invalid user data')

  await storage.set(USER_STORAGE_KEY, normalizedUser)
  return normalizedUser
}

const loginWithWechat = () => new Promise((resolve, reject) => {
  wx.login({
    success: resolve,
    fail: reject
  })
})

const createUser = async () => {
  await loginWithWechat()

  return saveUser({
    createdAt: new Date().toISOString(),
    items: []
  })
}

const clearUserData = async () => {
  await Promise.all([
    storage.remove(USER_STORAGE_KEY),
    storage.remove(TRACKING_STORAGE_KEY)
  ])
}

const addItem = async (item) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const updatedUser = {
    ...user,
    items: [item, ...user.items]
  }

  await saveUser(updatedUser)
  return updatedUser
}

const createHall = async ({ name, description = '', coverImage = '' }) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const normalizedName = String(name || '').trim()
  if (!normalizedName) throw new Error('Hall name is required')
  if (user.halls.some((hall) => hall.name === normalizedName)) {
    throw new Error('Hall name already exists')
  }

  const hall = {
    id: `hall_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: normalizedName,
    description: String(description || '').trim(),
    coverImage: String(coverImage || ''),
    createdAt: new Date().toISOString()
  }

  const updatedUser = {
    ...user,
    halls: [...user.halls, hall]
  }

  await saveUser(updatedUser)
  return hall
}

const deleteItem = async (itemId) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')
  if (!itemId) throw new Error('Item id is required')

  const items = user.items.filter((item) => item.id !== itemId)
  if (items.length === user.items.length) throw new Error('Item not found')

  const monthlyHighlights = Object.keys(user.monthlyHighlights || {}).reduce((result, monthKey) => {
    const highlight = user.monthlyHighlights[monthKey]
    if (!highlight || highlight.itemId !== itemId) result[monthKey] = highlight
    return result
  }, {})

  const updatedUser = {
    ...user,
    items,
    monthlyHighlights
  }

  await saveUser(updatedUser)
  return updatedUser
}

const deleteItems = async (itemIds) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const ids = new Set(Array.isArray(itemIds) ? itemIds.filter(Boolean) : [])
  if (!ids.size) throw new Error('No items selected')

  const items = user.items.filter((item) => !ids.has(item.id))
  const deletedCount = user.items.length - items.length
  if (!deletedCount) throw new Error('Items not found')

  const monthlyHighlights = Object.keys(user.monthlyHighlights || {}).reduce((result, monthKey) => {
    const highlight = user.monthlyHighlights[monthKey]
    if (!highlight || !ids.has(highlight.itemId)) result[monthKey] = highlight
    return result
  }, {})

  const updatedUser = { ...user, items, monthlyHighlights }
  await saveUser(updatedUser)
  return { user: updatedUser, deletedCount }
}

const deleteHalls = async (hallIds) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const ids = new Set(Array.isArray(hallIds) ? hallIds.filter(Boolean) : [])
  if (!ids.size) throw new Error('No halls selected')

  const existingIds = new Set(user.halls.map((hall) => hall.id))
  const validIds = new Set([...ids].filter((id) => existingIds.has(id)))
  if (!validIds.size) throw new Error('Halls not found')
  const deletedHallNames = new Set(
    user.halls.filter((hall) => validIds.has(hall.id)).map((hall) => hall.name)
  )

  const halls = user.halls.filter((hall) => !validIds.has(hall.id))
  let movedItemCount = 0
  const items = user.items.map((item) => {
    const belongsToDeletedHall = (item.hallId && validIds.has(item.hallId)) ||
      (!item.hallId && deletedHallNames.has(item.hall))
    if (!belongsToDeletedHall) return item
    movedItemCount += 1
    const movedItem = { ...item, hall: '主馆' }
    delete movedItem.hallId
    return movedItem
  })

  const updatedUser = { ...user, halls, items }
  await saveUser(updatedUser)
  return { user: updatedUser, deletedCount: validIds.size, movedItemCount }
}

const updateItem = async (itemId, changes) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')
  if (!itemId) throw new Error('Item id is required')

  let updatedItem = null
  const items = user.items.map((item) => {
    if (item.id !== itemId) return item
    updatedItem = {
      ...item,
      ...changes,
      id: item.id,
      createdAt: item.createdAt
    }
    return updatedItem
  })

  if (!updatedItem) throw new Error('Item not found')
  await saveUser({ ...user, items })
  return updatedItem
}

const moveItemsToHall = async (itemIds, targetHall) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const ids = new Set(Array.isArray(itemIds) ? itemIds.filter(Boolean) : [])
  if (!ids.size) throw new Error('No items selected')

  const targetName = String(targetHall && targetHall.name || '').trim()
  const targetId = String(targetHall && targetHall.id || '').trim()
  if (!targetName) throw new Error('Target hall is required')

  let movedCount = 0
  const items = user.items.map((item) => {
    if (!ids.has(item.id)) return item

    movedCount += 1
    const movedItem = { ...item, hall: targetName }
    if (targetId) movedItem.hallId = targetId
    else delete movedItem.hallId
    return movedItem
  })

  if (!movedCount) throw new Error('Items not found')

  const updatedUser = { ...user, items }
  await saveUser(updatedUser)
  return { user: updatedUser, movedCount }
}

const getMonthKey = (date = new Date()) => {
  const value = new Date(date)
  const month = String(value.getMonth() + 1).padStart(2, '0')
  return `${value.getFullYear()}-${month}`
}

const getItemsForMonth = (user, monthKey = getMonthKey()) => {
  const normalizedUser = normalizeUser(user)
  if (!normalizedUser) return []

  return normalizedUser.items.filter((item) => {
    const itemDate = item.date || item.createdAt
    return typeof itemDate === 'string' && itemDate.slice(0, 7) === monthKey
  })
}

const getMonthlyHighlight = (user, monthKey = getMonthKey()) => {
  const normalizedUser = normalizeUser(user)
  return normalizedUser?.monthlyHighlights?.[monthKey] || null
}

const saveMonthlyHighlight = async (monthKey, highlight) => {
  const user = await getUser()
  if (!user) throw new Error('User not found')

  const updatedUser = {
    ...user,
    monthlyHighlights: {
      ...(user.monthlyHighlights || {}),
      [monthKey]: highlight
    }
  }

  await saveUser(updatedUser)
  return updatedUser
}

const getCollectionCount = (user) => {
  return normalizeUser(user)?.items.length || 0
}

const getLocalCalendarIndex = (value) => {
  const date = new Date(value)
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

const getMuseumDays = (user, today = new Date()) => {
  const normalizedUser = normalizeUser(user)
  if (!normalizedUser) return 0

  const createdDay = getLocalCalendarIndex(normalizedUser.createdAt)
  const currentDay = getLocalCalendarIndex(today)
  const elapsedDays = Math.floor((currentDay - createdDay) / DAY_IN_MS)

  return Math.max(1, elapsedDays + 1)
}

const formatStat = (value) => {
  const safeValue = Math.max(0, Number(value) || 0)
  return String(safeValue).padStart(3, '0')
}

module.exports = {
  USER_STORAGE_KEY,
  getUser,
  saveUser,
  createUser,
  clearUserData,
  addItem,
  updateItem,
  createHall,
  deleteItem,
  deleteItems,
  deleteHalls,
  moveItemsToHall,
  getMonthKey,
  getItemsForMonth,
  getMonthlyHighlight,
  saveMonthlyHighlight,
  getCollectionCount,
  getMuseumDays,
  formatStat
}
