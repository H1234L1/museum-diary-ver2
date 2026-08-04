const { getUser, createHall, moveItemsToHall } = require('../../services/user-service')

const TYPE_LABELS = {
  photo: '图片',
  text: '文字',
  audio: '语音'
}

const DEFAULT_IMAGES = {
  photo: '/assets/art/exhibit-city.jpg',
  text: '/assets/art/home-hero.jpg',
  audio: '/assets/art/gramophone.jpg'
}

const getItemDate = (item) => {
  if (item.date) return new Date(`${item.date}T00:00:00`)
  return new Date(item.createdAt || Date.now())
}

const groupItems = (items) => {
  const groups = items.reduce((result, item) => {
    const date = getItemDate(item)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const key = `${year}-${String(month).padStart(2, '0')}`

    if (!result[key]) {
      result[key] = {
        key,
        month: `${month} 月，${year}年`,
        items: []
      }
    }

    const type = ['photo', 'text', 'audio'].includes(item.type) ? item.type : 'text'
    result[key].items.push({
      ...item,
      type,
      category: TYPE_LABELS[type],
      title: item.title || '未命名展品',
      excerpt: item.story || '这件展品还没有文字说明。',
      image: item.image || DEFAULT_IMAGES[type],
      duration: item.duration || '00:42'
    })

    return result
  }, {})

  return Object.values(groups)
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((group) => ({
      ...group,
      count: group.items.length,
      items: group.items.sort((a, b) => getItemDate(b) - getItemDate(a))
    }))
}

Page({
  data: {
    activeFilter: '全部',
    filters: ['全部', '图片', '文字', '语音'],
    statusBarHeight: 20,
    navigationBarHeight: 44,
    hallName: '主馆',
    hallId: '',
    groups: [],
    selecting: false,
    selectedIds: [],
    selectedMap: {},
    selectedCount: 0,
    moveTargets: [],
    targetSheetVisible: false,
    moving: false,
    creatorVisible: false,
    newHallName: '',
    newHallDescription: '',
    selectedCover: '',
    coverOptions: [],
    creating: false
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
      hallId: options.hallId ? decodeURIComponent(options.hallId) : ''
    })
  },

  async onShow() {
    await this.loadHall()
  },

  async loadHall() {
    const user = await getUser()
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    const hallName = this.data.hallName || '主馆'
    const hallId = this.data.hallId
    const hallItems = user.items.filter((item) => (
      (hallId && item.hallId === hallId) || (item.hall || '主馆') === hallName
    ))
    const moveTargets = [
      { id: '', name: '主馆' },
      ...user.halls.map((hall) => ({ id: hall.id, name: hall.name }))
    ].filter((hall) => {
      if (hallId && hall.id) return hall.id !== hallId
      return hall.name !== hallName
    })
    const coverOptions = user.items
      .filter((item) => item.image)
      .reduce((images, item) => images.includes(item.image) ? images : [...images, item.image], [])
      .slice(0, 12)

    this.setData({ groups: groupItems(hallItems), moveTargets, coverOptions })
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/gallery/gallery' })
    })
  },

  openShowcase() {
    const hallName = encodeURIComponent(this.data.hallName || '主馆')
    const hallId = this.data.hallId ? `&hallId=${encodeURIComponent(this.data.hallId)}` : ''
    wx.redirectTo({ url: `/pages/showcase/showcase?hall=${hallName}${hallId}` })
  },

  selectFilter(e) {
    this.setData({ activeFilter: e.currentTarget.dataset.filter })
  },

  openSearch() {
    wx.showModal({
      title: '搜索馆藏',
      editable: true,
      placeholderText: '输入展品名称或内容',
      confirmText: '搜索'
    })
  },

  toggleSelectionMode() {
    const selecting = !this.data.selecting
    this.setData({
      selecting,
      selectedIds: [],
      selectedMap: {},
      selectedCount: 0,
      targetSheetVisible: false
    })
  },

  handleExhibitTap(e) {
    const { id, type } = e.currentTarget.dataset
    if (!id) return

    if (!this.data.selecting) {
      wx.navigateTo({ url: `/pages/detail/detail?type=${type || 'text'}&id=${id}` })
      return
    }

    const selectedMap = { ...this.data.selectedMap }
    if (selectedMap[id]) delete selectedMap[id]
    else selectedMap[id] = true
    const selectedIds = Object.keys(selectedMap)
    this.setData({ selectedMap, selectedIds, selectedCount: selectedIds.length })
  },

  openMoveTargets() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: '请先选择展品', icon: 'none' })
      return
    }
    this.setData({ targetSheetVisible: true })
  },

  closeTargetSheet() {
    if (this.data.moving) return
    this.setData({ targetSheetVisible: false })
  },

  noop() {},

  async confirmMove(e) {
    if (this.data.moving) return
    const target = this.data.moveTargets[e.currentTarget.dataset.index]
    if (!target) return

    this.setData({ moving: true })
    try {
      const result = await moveItemsToHall(this.data.selectedIds, target)
      this.setData({
        moving: false,
        selecting: false,
        selectedIds: [],
        selectedMap: {},
        selectedCount: 0,
        targetSheetVisible: false
      })
      await this.loadHall()
      wx.showToast({ title: `已移动 ${result.movedCount} 件`, icon: 'success' })
    } catch (error) {
      this.setData({ moving: false })
      wx.showToast({ title: '移动失败，请重试', icon: 'none' })
    }
  },

  createHallAndMove() {
    if (this.data.moving) return
    this.setData({
      targetSheetVisible: false,
      creatorVisible: true,
      newHallName: '',
      newHallDescription: '',
      selectedCover: '',
      creating: false
    })
  },

  closeCreator() {
    if (this.data.creating) return
    this.setData({ creatorVisible: false, targetSheetVisible: true })
  },

  updateNewHallName(e) {
    this.setData({ newHallName: e.detail.value })
  },

  updateNewHallDescription(e) {
    this.setData({ newHallDescription: e.detail.value })
  },

  chooseDefaultCover() {
    this.setData({ selectedCover: '' })
  },

  chooseCover(e) {
    this.setData({ selectedCover: e.currentTarget.dataset.image })
  },

  async submitNewHallAndMove() {
    const name = this.data.newHallName.trim()
    if (!name) {
      wx.showToast({ title: '请先为副馆取一个名字', icon: 'none' })
      return
    }
    if (this.data.creating) return

    this.setData({ creating: true, moving: true })
    try {
      const hall = await createHall({
        name,
        description: this.data.newHallDescription,
        coverImage: this.data.selectedCover
      })
      const result = await moveItemsToHall(this.data.selectedIds, hall)
      this.setData({
        creating: false,
        moving: false,
        creatorVisible: false,
        targetSheetVisible: false,
        selecting: false,
        selectedIds: [],
        selectedMap: {},
        selectedCount: 0
      })
      await this.loadHall()
      wx.showToast({ title: `已新建并移动 ${result.movedCount} 件`, icon: 'success' })
    } catch (error) {
      this.setData({ creating: false, moving: false })
      wx.showToast({
        title: error.message === 'Hall name already exists' ? '已经有同名副馆了' : '创建或移动失败，请重试',
        icon: 'none'
      })
    }
  }
})
