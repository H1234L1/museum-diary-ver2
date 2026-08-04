const {
  getUser,
  getMonthKey,
  getItemsForMonth
} = require('../../services/user-service')

const isMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')

const monthKeyToDate = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

const getPastMonthKeys = (user, currentMonthKey) => {
  const candidateKeys = [getMonthKey(user.createdAt)]
    .concat(user.items.map((item) => (item.date || item.createdAt || '').slice(0, 7)))
    .filter(isMonthKey)
    .sort()

  const earliestMonthKey = candidateKeys[0] || currentMonthKey
  const earliestDate = monthKeyToDate(earliestMonthKey)
  const cursor = monthKeyToDate(currentMonthKey)
  cursor.setMonth(cursor.getMonth() - 1)

  const monthKeys = []
  while (cursor >= earliestDate && monthKeys.length < 120) {
    monthKeys.push(getMonthKey(cursor))
    cursor.setMonth(cursor.getMonth() - 1)
  }
  return monthKeys
}

Page({
  data: {
    currentMonthKey: '',
    currentMonthNumber: '',
    currentMonthLabel: '',
    currentItemCount: 0,
    pastReports: []
  },

  async onShow() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const currentMonthKey = getMonthKey()
    const currentMonthNumber = Number(currentMonthKey.slice(5))
    const pastReports = getPastMonthKeys(user, currentMonthKey).map((monthKey) => ({
      monthKey,
      year: monthKey.slice(0, 4),
      monthNumber: Number(monthKey.slice(5)),
      itemCount: getItemsForMonth(user, monthKey).length
    }))

    this.setData({
      currentMonthKey,
      currentMonthNumber,
      currentMonthLabel: currentMonthKey.replace('-', '.'),
      currentItemCount: getItemsForMonth(user, currentMonthKey).length,
      pastReports
    })
  },

  openCurrentReport() {
    if (!this.data.currentMonthKey) return
    wx.navigateTo({ url: `/pages/report/report?month=${this.data.currentMonthKey}` })
  },

  handleTutorialAction(e) {
    if (e.detail.stepId === 'discover-reports') {
      wx.navigateTo({
        url: `/pages/report/report?month=${this.data.currentMonthKey}&tutorialComplete=1`
      })
    }
  }
})
