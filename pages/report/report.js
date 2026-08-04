const {
  getUser,
  getMonthKey,
  getItemsForMonth
} = require('../../services/user-service')
const { getMonthlyTracking } = require('../../services/tracking-service')

const formatMonth = (monthKey) => monthKey.replace('-', '.')
const getMonthName = (monthKey) => `${Number(monthKey.slice(5))} 月`

const countStoryCharacters = (items) => {
  return items.reduce((total, item) => {
    const story = String(item.story || '').replace(/\s/g, '')
    return total + Array.from(story).length
  }, 0)
}

const getFavoriteHall = (items) => {
  if (!items.length) return '暂无'

  const hallCounts = items.reduce((counts, item) => {
    const hall = String(item.hall || '主馆').trim() || '主馆'
    counts[hall] = (counts[hall] || 0) + 1
    return counts
  }, {})

  return Object.keys(hallCounts).sort((a, b) => hallCounts[b] - hallCounts[a])[0]
}

const formatExitTime = (timestamp) => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getAudioMinutes = (items) => {
  const durationMs = items.reduce((total, item) => total + Math.max(0, Number(item.audioDurationMs) || 0), 0)
  return durationMs ? Math.max(1, Math.round(durationMs / 60000)) : 0
}

Page({
  data: {
    monthKey: '',
    requestedMonthKey: '',
    monthText: '',
    monthName: '',
    monthlyItemCount: 0,
    monthlyWordCount: 0,
    monthlyImageCount: 0,
    monthlyVisitDays: 0,
    monthlyActiveMinutes: 0,
    monthlyAudioMinutes: 0,
    favoriteHall: '暂无',
    latestExitTime: '--:--'
  },

  async onLoad(options = {}) {
    this.tutorialCompletionPending = options.tutorialComplete === '1'
    const requestedMonthKey = /^\d{4}-(0[1-9]|1[0-2])$/.test(options.month || '')
      ? options.month
      : getMonthKey()
    this.setData({ requestedMonthKey })
    await this.loadReport()
    if (this.tutorialCompletionPending) {
      this.tutorialCompletionTimer = setTimeout(() => this.finishTutorialPreview(), 5000)
    }
  },

  onUnload() {
    if (this.tutorialCompletionTimer) clearTimeout(this.tutorialCompletionTimer)
  },

  async onShow() {
    if (this.data.monthKey) await this.loadReport()
  },

  async loadReport() {
    const monthKey = this.data.requestedMonthKey || getMonthKey()
    const [user, tracking] = await Promise.all([
      getUser(),
      getMonthlyTracking(monthKey)
    ])

    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const monthItems = getItemsForMonth(user, monthKey)
    const activeMs = Math.max(0, Number(tracking.activeMs) || 0)

    this.setData({
      monthKey,
      monthText: formatMonth(monthKey),
      monthName: getMonthName(monthKey),
      monthlyItemCount: monthItems.length,
      monthlyWordCount: countStoryCharacters(monthItems),
      monthlyImageCount: monthItems.filter((item) => Boolean(item.image)).length,
      monthlyVisitDays: tracking.visitDays,
      monthlyActiveMinutes: activeMs ? Math.max(1, Math.round(activeMs / 60000)) : 0,
      monthlyAudioMinutes: getAudioMinutes(monthItems),
      favoriteHall: getFavoriteHall(monthItems),
      latestExitTime: formatExitTime(tracking.lastExitAt)
    })
  },

  goBack() {
    if (this.tutorialCompletionPending) {
      this.finishTutorialPreview()
      return
    }
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/summary/summary' })
    })
  },

  finishTutorialPreview() {
    if (!this.tutorialCompletionPending) return
    this.tutorialCompletionPending = false
    if (this.tutorialCompletionTimer) {
      clearTimeout(this.tutorialCompletionTimer)
      this.tutorialCompletionTimer = null
    }
    wx.reLaunch({ url: '/pages/index/index?tutorialComplete=1' })
  },

  handleTutorialPreviewTap() {
    this.finishTutorialPreview()
  },

  onShareAppMessage() {
    return {
      title: `我的 ${this.data.monthName || ''}人生博物馆报告`,
      path: `/pages/report/report?month=${this.data.monthKey || getMonthKey()}`
    }
  }
})
