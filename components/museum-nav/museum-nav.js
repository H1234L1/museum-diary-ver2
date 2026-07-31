Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },
  data: {
    items: [
      { key: 'home', label: '主页', icon: '馆', url: '/pages/index/index' },
      { key: 'gallery', label: '展厅', icon: '展', url: '/pages/gallery/gallery' },
      { key: 'summary', label: '总结', icon: '总', url: '/pages/summary/summary' },
      { key: 'profile', label: '我的', icon: '我', url: '/pages/profile/profile' }
    ]
  }
})
