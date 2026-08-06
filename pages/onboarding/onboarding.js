const { getUser, createUser } = require('../../services/user-service')
const { startTutorial } = require('../../services/tutorial-service')

Page({
  data: {
    ready: false,
    loggingIn: false,
    openingDoor: false,
    doorsOpening: false
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
    this.setData({ loggingIn: true, openingDoor: true, doorsOpening: false })

    try {
      await createUser()
      await startTutorial()
      const doorAnimation = new Promise((resolve) => {
        this.setData({ doorsOpening: true }, () => setTimeout(resolve, 1500))
      })
      await doorAnimation
      wx.reLaunch({ url: '/pages/index/index?museumEntrance=1' })
    } catch (error) {
      this.setData({ loggingIn: false, openingDoor: false, doorsOpening: false })
      wx.showToast({ title: '登录没有成功，请重试', icon: 'none' })
    }
  }
})
