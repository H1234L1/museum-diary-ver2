const { getUser } = require('../../services/user-service')

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
    groups: []
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
    if (!user) {
      wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      return
    }

    this.setData({
      groups: groupItems(user.items)
    })
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/gallery/gallery' })
    })
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

  openSort() {
    wx.showActionSheet({
      itemList: ['按入藏时间排序', '按展品类型排序', '按标题排序']
    })
  }
})
