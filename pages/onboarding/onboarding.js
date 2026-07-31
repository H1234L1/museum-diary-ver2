const { getUser, createUser } = require('../../services/user-service')
const { startTutorial } = require('../../services/tutorial-service')

Page({
  data: {
    ready: false,
    loggingIn: false
  },

  async onLoad() {
    try {
      const user = await getUser()
      if (user) {
        wx.reLaunch({ url: '/pages/index/index' })
        return
      }
    } catch (error) {
      wx.showToast({ title: '读取数据失败，请重试', icon: 'none' })
    }

    this.setData({ ready: true })
  },

  async startMuseum() {
    if (this.data.loggingIn) return
    this.setData({ loggingIn: true })
    wx.showLoading({ title: '正在开启博物馆', mask: true })

    try {
      await createUser()
      await startTutorial()
      wx.hideLoading()
      wx.reLaunch({ url: '/pages/index/index' })
    } catch (error) {
      wx.hideLoading()
      this.setData({ loggingIn: false })
      wx.showToast({ title: '登录没有成功，请重试', icon: 'none' })
    }
  }
})
