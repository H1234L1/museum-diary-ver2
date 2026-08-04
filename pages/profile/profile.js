const { getUser, clearUserData } = require('../../services/user-service')
const { resetTutorial } = require('../../services/tutorial-service')

Page({
  data: {
    statusBarHeight: 20,
    navigationBarHeight: 44,
    items: [
      {
        icon: '锁',
        name: '隐私与安全',
        description: '授权管理、本地存储与数据清除'
      },
      {
        icon: '引',
        name: '重新查看新手引导',
        description: '再次了解收藏、展厅与月报'
      }
    ],
    toast: ''
  },

  onLoad() {
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
      navigationBarHeight: Math.max(40, navigationBarHeight)
    })
  },

  async onShow() {
    const user = await getUser()
    if (!user) wx.reLaunch({ url: '/pages/onboarding/onboarding' })
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/index/index' })
    })
  },

  tapMenu(e) {
    const name = e.currentTarget.dataset.name
    if (name === '隐私与安全') this.openPrivacyMenu()
    if (name === '重新查看新手引导') this.confirmRestartTutorial()
  },

  openPrivacyMenu() {
    wx.showActionSheet({
      itemList: ['管理微信授权', '查看本地数据说明', '清除本地博物馆数据'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.openWechatSettings()
        if (tapIndex === 1) this.showStorageNotice()
        if (tapIndex === 2) this.confirmClearData()
      }
    })
  },

  openWechatSettings() {
    if (!wx.openSetting) {
      this.notice('当前微信版本暂不支持授权管理')
      return
    }
    wx.openSetting({
      fail: () => this.notice('未能打开微信授权设置')
    })
  },

  showStorageNotice() {
    wx.showModal({
      title: '本地数据说明',
      content: '目前你的展品、展馆和月报选择保存在当前设备的微信小程序 storage 中，尚未上传到微信云数据库。更换设备或清除微信数据后，内容可能无法恢复。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#8f6735'
    })
  },

  confirmClearData() {
    wx.showModal({
      title: '清除人生博物馆数据？',
      content: '这会删除当前设备中的全部展品、展馆和月报选择，且无法恢复。不会清除其他小程序或微信数据。',
      cancelText: '取消',
      confirmText: '确认清除',
      confirmColor: '#9a4f3c',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await clearUserData()
          wx.showToast({ title: '本地数据已清除', icon: 'success' })
          setTimeout(() => wx.reLaunch({ url: '/pages/onboarding/onboarding' }), 700)
        } catch (error) {
          this.notice('清除失败，请重试')
        }
      }
    })
  },

  confirmRestartTutorial() {
    wx.showModal({
      title: '重新查看新手引导？',
      content: '将从首页重新开始收藏展品、创建展馆和查看月报的引导，不会删除任何馆藏。',
      cancelText: '取消',
      confirmText: '重新开始',
      confirmColor: '#8f6735',
      success: async ({ confirm }) => {
        if (!confirm) return
        try {
          await resetTutorial()
          wx.reLaunch({ url: '/pages/index/index' })
        } catch (error) {
          this.notice('暂时无法重新开启引导')
        }
      }
    })
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
