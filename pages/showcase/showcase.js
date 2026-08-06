const { getUser } = require('../../services/user-service')

const getItemTime = (item) => {
  const createdTime = new Date(item.createdAt || 0).getTime()
  if (!Number.isNaN(createdTime) && createdTime > 0) return createdTime

  if (item.date) {
    const dateTime = new Date(`${item.date}T00:00:00`).getTime()
    if (!Number.isNaN(dateTime)) return dateTime
  }
  return 0
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
    recordCount: 0,
    displayItems: [],
    currentExhibit: null,
    currentIndex: 0,
    transitionClass: '',
    isTransitioning: false,
    hasItems: false,
    canCycle: false,
    showingAddSlot: true,
    addSlotTitle: '添加展品',
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
    const records = normalizeItems(user.items.filter((item) => (
      (hallId && item.hallId === hallId) || (item.hall || '主馆') === hallName
    )))
    const items = [
      ...records,
      {
        id: '__add_exhibit__',
        type: 'add',
        isAdd: true,
        title: '添加展品',
        number: String(records.length + 1).padStart(4, '0')
      }
    ]

    const currentIndex = Math.min(this.data.currentIndex, items.length - 1)
    this.setData({ items, recordCount: records.length, currentIndex }, () => this.updateDisplay())
  },

  updateDisplay() {
    const { items, currentIndex, recordCount } = this.data
    const total = items.length
    const safeIndex = total ? Math.min(currentIndex, total - 1) : 0
    const displayItems = []

    if (total === 1) {
      displayItems.push({ ...items[0], position: 'center', renderKey: items[0].id })
    } else if (total === 2) {
      displayItems.push({ ...items[safeIndex], position: 'center', renderKey: items[safeIndex].id })
      displayItems.push({ ...items[(safeIndex + 1) % total], position: 'right', renderKey: items[(safeIndex + 1) % total].id })
    } else if (total > 2) {
      displayItems.push({ ...items[(safeIndex - 1 + total) % total], position: 'left', renderKey: items[(safeIndex - 1 + total) % total].id })
      displayItems.push({ ...items[safeIndex], position: 'center', renderKey: items[safeIndex].id })
      displayItems.push({ ...items[(safeIndex + 1) % total], position: 'right', renderKey: items[(safeIndex + 1) % total].id })
    }

    this.setData({
      currentIndex: safeIndex,
      displayItems,
      currentExhibit: total ? items[safeIndex] : null,
      hasItems: total > 0,
      canCycle: total > 1,
      showingAddSlot: Boolean(items[safeIndex] && items[safeIndex].isAdd),
      addSlotTitle: '添加展品',
      nextExhibitNumber: String(recordCount + 1).padStart(4, '0'),
      progressText: items[safeIndex] && items[safeIndex].isAdd
        ? '新增展位'
        : `${safeIndex + 1} / ${recordCount}`
    })
  },

  showPrevious() {
    const total = this.data.items.length
    if (total < 2 || this.data.isTransitioning) return
    this.switchExhibit((this.data.currentIndex - 1 + total) % total, 'previous')
  },

  showNext() {
    const total = this.data.items.length
    if (total < 2 || this.data.isTransitioning) return
    this.switchExhibit((this.data.currentIndex + 1) % total, 'next')
  },

  onGalleryTouchStart(e) {
    const touch = e.touches && e.touches[0]
    if (!touch || this.data.isTransitioning) return
    this.galleryTouchStart = {
      x: touch.clientX,
      y: touch.clientY
    }
  },

  onGalleryTouchEnd(e) {
    if (!this.galleryTouchStart || this.data.isTransitioning) return
    const touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return

    const deltaX = touch.clientX - this.galleryTouchStart.x
    const deltaY = touch.clientY - this.galleryTouchStart.y
    this.galleryTouchStart = null

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return

    this.gallerySuppressTapUntil = Date.now() + 350
    if (deltaX < 0) this.showNext()
    else this.showPrevious()
  },

  onGalleryTouchCancel() {
    this.galleryTouchStart = null
  },

  switchExhibit(nextIndex, direction) {
    const { items, currentIndex } = this.data
    const total = items.length
    if (total < 3) {
      this.setData({ currentIndex: nextIndex }, () => this.updateDisplay())
      return
    }

    const previousIndex = (currentIndex - 1 + total) % total
    const followingIndex = (currentIndex + 1) % total
    const incomingIndex = direction === 'next'
      ? (nextIndex + 1) % total
      : (nextIndex - 1 + total) % total
    const transitionId = Date.now()
    let stagedItems
    let movingItems

    if (direction === 'next') {
      stagedItems = [
        { ...items[previousIndex], position: 'left', renderKey: `out-left-${transitionId}` },
        { ...items[currentIndex], position: 'center', renderKey: items[currentIndex].id },
        { ...items[followingIndex], position: 'right', renderKey: items[followingIndex].id },
        { ...items[incomingIndex], position: 'pre-right', renderKey: `in-right-${transitionId}` }
      ]
      movingItems = stagedItems.map((item) => {
        if (item.position === 'left') return { ...item, position: 'exit-left' }
        if (item.position === 'center') return { ...item, position: 'left' }
        if (item.position === 'right') return { ...item, position: 'center' }
        return { ...item, position: 'right' }
      })
    } else {
      stagedItems = [
        { ...items[previousIndex], position: 'left', renderKey: items[previousIndex].id },
        { ...items[currentIndex], position: 'center', renderKey: items[currentIndex].id },
        { ...items[followingIndex], position: 'right', renderKey: `out-right-${transitionId}` },
        { ...items[incomingIndex], position: 'pre-left', renderKey: `in-left-${transitionId}` }
      ]
      movingItems = stagedItems.map((item) => {
        if (item.position === 'right') return { ...item, position: 'exit-right' }
        if (item.position === 'center') return { ...item, position: 'right' }
        if (item.position === 'left') return { ...item, position: 'center' }
        return { ...item, position: 'left' }
      })
    }

    this.setData({
      isTransitioning: true,
      transitionClass: 'gallery-rotating',
      displayItems: stagedItems
    }, () => {
      const start = () => this.setData({ displayItems: movingItems })
      if (wx.nextTick) wx.nextTick(start)
      else setTimeout(start, 20)
    })

    this.transitionTimer = setTimeout(() => {
      this.setData({
        currentIndex: nextIndex,
        transitionClass: '',
        isTransitioning: false
      }, () => this.updateDisplay())
    }, 460)
  },

  openExhibit(e) {
    if (Date.now() < (this.gallerySuppressTapUntil || 0)) return
    const { id, type } = e.currentTarget.dataset
    if (type === 'add' || id === '__add_exhibit__') {
      this.addExhibit()
      return
    }
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
  },

  onUnload() {
    if (this.transitionTimer) clearTimeout(this.transitionTimer)
    if (this.transitionEndTimer) clearTimeout(this.transitionEndTimer)
  }
})
