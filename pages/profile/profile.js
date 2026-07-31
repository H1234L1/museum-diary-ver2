const {
  getUser,
  getCollectionCount,
  getMuseumDays,
  formatStat
} = require('../../services/user-service')

Page({
  data: {
    items: [
      { icon: '▣', name: '我的月度报告' },
      { icon: '⌁', name: '馆藏数据' },
      { icon: '♙', name: '隐私与安全' },
      { icon: '⚙', name: '设置' }
    ],
    collectionCount: '000',
    museumDays: '000',
    toast: ''
  },
  async onShow() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    this.setData({
      collectionCount: formatStat(getCollectionCount(user)),
      museumDays: formatStat(getMuseumDays(user))
    })
  },
  openHome() { wx.redirectTo({ url: '/pages/index/index' }) },
  tapMenu(e) {
    if (e.currentTarget.dataset.name === '我的月度报告') {
      wx.navigateTo({ url: '/pages/report/report' })
      return
    }
    this.setData({ toast: `${e.currentTarget.dataset.name}已加入演示` })
    setTimeout(() => this.setData({ toast: '' }), 1600)
  }
})
