const {
  getUser,
  getCollectionCount,
  getMuseumDays,
  formatStat
} = require('../../services/user-service')
const { getCurrentUser } = require('../../services/auth-service')

Page({
  data: {
    exhibitCount: '000',
    museumDays: '000',
    showLoginDot: true,
    entranceCoverVisible: false,
    entranceCoverLeaving: false
  },
  onLoad(options) {
    this.shouldShowTutorialComplete = options.tutorialComplete === '1'
    if (options.museumEntrance === '1') {
      this.setData({ entranceCoverVisible: true })
      this.entranceCoverFallbackTimer = setTimeout(() => this.startEntranceCoverExit(), 900)
    }
  },
  onUnload() {
    if (this.entranceCoverTimer) clearTimeout(this.entranceCoverTimer)
    if (this.entranceCoverFallbackTimer) clearTimeout(this.entranceCoverFallbackTimer)
    if (this.entranceCoverRemoveTimer) clearTimeout(this.entranceCoverRemoveTimer)
  },
  async onShow() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    this.setData({
      exhibitCount: formatStat(getCollectionCount(user)),
      museumDays: formatStat(getMuseumDays(user))
    })
    try {
      const account = getApp().globalData.currentUser || await getCurrentUser()
      getApp().globalData.currentUser = account
      this.setData({ showLoginDot: !account })
    } catch (error) {
      this.setData({ showLoginDot: true })
    }

    if (this.shouldShowTutorialComplete) {
      this.shouldShowTutorialComplete = false
      wx.showModal({
        title: '新手引导完成',
        content: '你已经完成新手引导，可以开始自由收藏和布置属于你的人生博物馆了。',
        showCancel: false,
        confirmText: '开始探索',
        confirmColor: '#8a673b'
      })
    }
  },
  go(url) { wx.redirectTo({ url }) },
  openGallery() { this.go('/pages/gallery/gallery') },
  openRecord() { this.go('/pages/record/record') },
  openSummary() { this.go('/pages/summary/summary') },
  openProfile() { this.go('/pages/profile/profile') },
  createExhibit() { this.go('/pages/record/record?new=1') },
  handleEntranceCoverLoaded() {
    this.entranceCoverTimer = setTimeout(() => this.startEntranceCoverExit(), 100)
  },
  startEntranceCoverExit() {
    if (!this.data.entranceCoverVisible || this.data.entranceCoverLeaving) return
    if (this.entranceCoverFallbackTimer) clearTimeout(this.entranceCoverFallbackTimer)
    this.setData({ entranceCoverLeaving: true })
    this.entranceCoverRemoveTimer = setTimeout(() => {
      this.setData({ entranceCoverVisible: false })
    }, 360)
  },
  handleTutorialAction(e) {
    if (e.detail.stepId === 'collect-first-exhibit') this.createExhibit()
  },
  onShareAppMessage() {
    return { title: '人生博物馆', path: '/pages/index/index' }
  }
})
