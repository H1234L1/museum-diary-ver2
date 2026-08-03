const {
  getUser,
  getMonthKey,
  getItemsForMonth,
  getMonthlyHighlight,
  saveMonthlyHighlight
} = require('../../services/user-service')

const formatMonth = (monthKey) => monthKey.replace('-', '.')
const getMonthName = (monthKey) => `${Number(monthKey.slice(5))} 月`
const truncate = (value, length = 22) => {
  return value.length > length ? `${value.slice(0, length)}…` : value
}

const splitSentences = (value) => {
  return value
    .split(/[。！？!?；;.\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

Page({
  data: {
    monthKey: '',
    requestedMonthKey: '',
    monthText: '',
    monthName: '',
    monthlyItemCount: 0,
    monthlyStoryDays: 0,
    monthlyWordCount: 0,
    monthlyAudioMinutes: 0,
    monthlyHighlight: null,
    photoOptions: [],
    sentenceOptions: [],
    selectorVisible: false,
    selectionMode: '',
    selectionOptions: [],
    selectionTitle: '',
    toast: ''
  },

  async onLoad(options = {}) {
    const requestedMonthKey = /^\d{4}-(0[1-9]|1[0-2])$/.test(options.month || '')
      ? options.month
      : getMonthKey()
    this.setData({ requestedMonthKey })
    await this.loadReport()
  },

  async onShow() {
    if (this.data.monthKey) await this.loadReport()
  },

  async loadReport() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const monthKey = this.data.requestedMonthKey || getMonthKey()
    const monthItems = getItemsForMonth(user, monthKey)
    const photoOptions = monthItems
      .filter((item) => item.image)
      .map((item) => ({
        id: item.id,
        image: item.image,
        date: item.date,
        label: item.story ? truncate(item.story) : `${item.date} 的照片`
      }))
    const sentenceOptions = monthItems.reduce((options, item) => {
      splitSentences(item.story || '').forEach((text, index) => {
        options.push({
          id: `${item.id}-sentence-${index}`,
          itemId: item.id,
          text,
          date: item.date
        })
      })
      return options
    }, [])
    const uniqueStoryDays = new Set(monthItems.filter((item) => item.story).map((item) => item.date)).size
    const monthlyWordCount = monthItems.reduce((sum, item) => sum + (item.story || '').length, 0)

    this.setData({
      monthKey,
      monthText: formatMonth(monthKey),
      monthName: getMonthName(monthKey),
      monthlyItemCount: monthItems.length,
      monthlyStoryDays: uniqueStoryDays,
      monthlyWordCount,
      monthlyAudioMinutes: 0,
      monthlyHighlight: getMonthlyHighlight(user, monthKey),
      photoOptions,
      sentenceOptions
    })
  },

  editMoment() {
    wx.showActionSheet({
      itemList: ['选择本月照片', '选择本月一句日记'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.openSelector('photo')
        if (tapIndex === 1) this.openSelector('sentence')
      }
    })
  },

  openSelector(selectionMode) {
    const isPhoto = selectionMode === 'photo'
    const selectionOptions = isPhoto ? this.data.photoOptions : this.data.sentenceOptions

    if (!selectionOptions.length) {
      this.notice(isPhoto ? '这个月还没有带照片的日记' : '这个月还没有可选择的日记句子')
      return
    }

    this.setData({
      selectorVisible: true,
      selectionMode,
      selectionOptions,
      selectionTitle: isPhoto ? '选择本月照片' : '选择本月一句日记'
    })
  },

  closeSelector() {
    this.setData({ selectorVisible: false })
  },

  noop() {},

  async chooseHighlight(e) {
    const option = this.data.selectionOptions[e.currentTarget.dataset.index]
    if (!option) return

    const highlight = this.data.selectionMode === 'photo'
      ? { kind: 'photo', itemId: option.id, image: option.image, date: option.date }
      : { kind: 'sentence', itemId: option.itemId, text: option.text, date: option.date }

    try {
      await saveMonthlyHighlight(this.data.monthKey, highlight)
      this.setData({ monthlyHighlight: highlight, selectorVisible: false })
    } catch (error) {
      this.notice('保存本月记忆失败，请重试')
    }
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/summary/summary' })
    })
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  },

  onShareAppMessage() {
    return {
      title: `我的 ${this.data.monthName || ''}人生博物馆报告`,
      path: `/pages/report/report?month=${this.data.monthKey || getMonthKey()}`
    }
  }
})
