const { getUser } = require('../../services/user-service')

const getItemTime = (item) => {
  if (item.date) {
    const dateTime = new Date(`${item.date}T00:00:00`).getTime()
    if (!Number.isNaN(dateTime)) return dateTime
  }
  const createdTime = new Date(item.createdAt || 0).getTime()
  return Number.isNaN(createdTime) ? 0 : createdTime
}

const normalizeItems = (items) => items
  .slice()
  .sort((a, b) => getItemTime(a) - getItemTime(b))
  .map((item, index) => ({
    ...item,
    type: ['photo', 'text', 'audio'].includes(item.type) ? item.type : 'text',
    title: item.title || '未命名展品',
    story: item.story || '这件展品还没有文字说明。',
    number: String(index + 1).padStart(4, '0')
  }))

Page({
  data: {
    statusBarHeight: 20,
    navigationBarHeight: 44,
    hallName: '主馆',
    hallId: '',
    hallSubtitle: 'Life Museum',
    items: [],
    currentExhibit: null,
    currentIndex: 0,
    hasItems: false,
    canCycle: false,
    showingAddSlot: true,
    addSlotTitle: '收藏第一件展品',
    nextExhibitNumber: '0001',
    progressText: '等待第一件收藏'
  },

  onLoad(options = {}) {
    let hallName = '主馆'
    if (options.hall) {
      try {
        hallName = decodeURIComponent(options.hall)
      } catch (error) {
        hallName = options.hall
      }
    }

    const windowInfo = wx.getWindowInfo
      ? wx.getWindowInfo()
      : wx.getSystemInfoSync()
    const statusBarHeight = windowInfo.statusBarHeight || 20
    let navigationBarHeight = 44

    if (wx.getMenuButtonBoundingClientRect) {
      const capsule = wx.getMenuButtonBoundingClientRect()
      if (capsule && capsule.top && capsule.height) {
        navigationBarHeight = (capsule.top - statusBarHeight) * 2 + capsule.height
      }
    }

    this.setData({
      statusBarHeight,
      navigationBarHeight: Math.max(40, navigationBarHeight),
      hallName,
      hallId: options.hallId ? decodeURIComponent(options.hallId) : '',
      hallSubtitle: hallName === '主馆' ? 'Life Museum' : 'Private Collection'
    })
  },

  async onShow() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const hallName = this.data.hallName || '主馆'
    const hallId = this.data.hallId
    const items = normalizeItems(user.items.filter((item) => (
      (hallId && item.hallId === hallId) || (item.hall || '主馆') === hallName
    )))

    const currentIndex = items.length
      ? Math.min(this.data.currentIndex, items.length - 1)
      : 0
    this.setData({ items, currentIndex }, () => this.updateDisplay())
  },

  updateDisplay() {
    const { items, currentIndex } = this.data
    const total = items.length
    const slotCount = total + 1
    const safeIndex = Math.min(currentIndex, slotCount - 1)
    const showingAddSlot = safeIndex === total

    this.setData({
      currentIndex: safeIndex,
      currentExhibit: showingAddSlot ? null : items[safeIndex],
      hasItems: total > 0,
      canCycle: slotCount > 1,
      showingAddSlot,
      addSlotTitle: total ? '添加下一件收藏' : '收藏第一件展品',
      nextExhibitNumber: String(total + 1).padStart(4, '0'),
      progressText: showingAddSlot ? '新增展位' : `${safeIndex + 1} / ${total}`
    })
  },

  showPrevious() {
    const total = this.data.items.length + 1
    if (total < 2) return
    this.setData({
      currentIndex: (this.data.currentIndex - 1 + total) % total
    }, () => this.updateDisplay())
  },

  showNext() {
    const total = this.data.items.length + 1
    if (total < 2) return
    this.setData({
      currentIndex: (this.data.currentIndex + 1) % total
    }, () => this.updateDisplay())
  },

  openExhibit(e) {
    const { id, type } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/detail/detail?type=${type || 'text'}&id=${id}` })
  },

  addExhibit() {
    const hall = encodeURIComponent(this.data.hallName || '主馆')
    wx.navigateTo({ url: `/pages/record/record?new=1&hall=${hall}` })
  },

  openOverview() {
    const hall = encodeURIComponent(this.data.hallName || '主馆')
    const hallId = this.data.hallId ? `&hallId=${encodeURIComponent(this.data.hallId)}` : ''
    wx.redirectTo({ url: `/pages/hall/hall?hall=${hall}${hallId}` })
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/gallery/gallery' })
    })
  }
})
