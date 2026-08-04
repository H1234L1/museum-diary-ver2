const {
  getUser,
  createHall,
  formatStat
} = require('../../services/user-service')

const getHallItems = (user, hall) => {
  return user.items.filter((item) => item.hallId === hall.id || item.hall === hall.name)
}

const getMainHallItems = (user) => {
  return user.items.filter((item) => (item.hall || '主馆') === '主馆')
}

Page({
  data: {
    mainHallCount: '000',
    mainHallUrl: '/pages/showcase/showcase?hall=%E4%B8%BB%E9%A6%86',
    subHalls: [],
    coverOptions: [],
    creatorVisible: false,
    hallName: '',
    hallDescription: '',
    selectedCover: '',
    creating: false,
    toast: ''
  },

  async onShow() {
    await this.loadGallery()
  },

  async loadGallery() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const coverOptions = user.items
      .filter((item) => item.image)
      .reduce((images, item) => images.includes(item.image) ? images : [...images, item.image], [])
      .slice(0, 12)
    const subHalls = user.halls.map((hall) => {
      const items = getHallItems(user, hall)
      const firstPhoto = items.find((item) => item.image)
      return {
        ...hall,
        count: items.length,
        displayCover: hall.coverImage || (firstPhoto ? firstPhoto.image : ''),
        firstItem: items[0] || null
      }
    })

    this.setData({
      mainHallCount: formatStat(getMainHallItems(user).length),
      mainHallUrl: '/pages/showcase/showcase?hall=%E4%B8%BB%E9%A6%86',
      subHalls,
      coverOptions
    })
  },

  openCreator() {
    this.setData({
      creatorVisible: true,
      hallName: '',
      hallDescription: '',
      selectedCover: '',
      creating: false
    })
  },

  handleTutorialAction(e) {
    if (e.detail.stepId === 'create-gallery') this.openCreator()
  },

  closeCreator() {
    if (this.data.creating) return
    this.setData({ creatorVisible: false })
  },

  noop() {},

  updateHallName(e) {
    this.setData({ hallName: e.detail.value })
  },

  updateHallDescription(e) {
    this.setData({ hallDescription: e.detail.value })
  },

  chooseDefaultCover() {
    this.setData({ selectedCover: '' })
  },

  chooseCover(e) {
    this.setData({ selectedCover: e.currentTarget.dataset.image })
  },

  async submitHall() {
    const hallName = this.data.hallName.trim()
    if (!hallName) {
      this.notice('请先为副馆取一个名字')
      return
    }
    if (this.data.creating) return

    this.setData({ creating: true })
    try {
      await createHall({
        name: hallName,
        description: this.data.hallDescription,
        coverImage: this.data.selectedCover
      })
      this.setData({ creatorVisible: false, creating: false })
      await this.loadGallery()
      this.notice('副馆已创建')
    } catch (error) {
      this.setData({ creating: false })
      this.notice(error.message === 'Hall name already exists' ? '已经有同名副馆了' : '创建失败，请重试')
    }
  },

  openHall(e) {
    const hall = this.data.subHalls[e.currentTarget.dataset.index]
    if (!hall) return
    wx.navigateTo({
      url: `/pages/showcase/showcase?hall=${encodeURIComponent(hall.name)}&hallId=${encodeURIComponent(hall.id)}`
    })
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
