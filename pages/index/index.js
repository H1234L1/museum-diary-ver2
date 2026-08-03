const {
  getUser,
  getCollectionCount,
  getMuseumDays,
  formatStat
} = require('../../services/user-service')

Page({
  data: {
    exhibitCount: '000',
    museumDays: '000'
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
  },
  go(url) { wx.redirectTo({ url }) },
  openGallery() { this.go('/pages/gallery/gallery') },
  openRecord() { this.go('/pages/record/record') },
  openSummary() { this.go('/pages/summary/summary') },
  openProfile() { this.go('/pages/profile/profile') },
  createExhibit() { this.go('/pages/record/record?new=1') },
  handleTutorialAction(e) {
    if (e.detail.stepId === 'collect-first-exhibit') this.createExhibit()
  },
  onShareAppMessage() {
    return { title: '人生博物馆', path: '/pages/index/index' }
  }
})
