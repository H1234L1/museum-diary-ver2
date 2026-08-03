const { getUser, deleteItem } = require('../../services/user-service')

Page({
  data: {
    type: 'photo',
    record: null,
    displayDate: '',
    exhibitNumber: '----',
    statusBarHeight: 20,
    navigationBarHeight: 44,
    textGalleryHeight: 600,
    openedFromRecord: false,
    returnHall: '主馆',
    playing: false,
    deleting: false,
    toast: ''
  },
  async onLoad(options) {
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
      textGalleryHeight: Math.max(
        420,
        windowInfo.windowHeight - statusBarHeight - Math.max(40, navigationBarHeight)
      )
    })

    const user = await getUser()
    const record = options.id && user
      ? user.items.find((item) => item.id === options.id)
      : null
    const requestedType = ['photo', 'text', 'audio'].includes(options.type) ? options.type : 'photo'
    const type = record && ['photo', 'text', 'audio'].includes(record.type)
      ? record.type
      : requestedType
    const displayDate = record && record.date ? record.date.replace(/-/g, '.') : ''
    const recordIndex = record && user ? user.items.findIndex((item) => item.id === record.id) : -1
    const exhibitNumber = recordIndex >= 0
      ? String(user.items.length - recordIndex).padStart(4, '0')
      : '----'

    this.setData({
      type,
      record,
      displayDate,
      exhibitNumber,
      openedFromRecord: options.from === 'record',
      returnHall: (record && record.hall) || options.hall || '主馆'
    })

    if (record && record.audio && wx.createInnerAudioContext) {
      this.audioContext = wx.createInnerAudioContext()
      this.audioContext.src = record.audio
      this.audioContext.onEnded(() => this.setData({ playing: false }))
      this.audioContext.onError(() => {
        this.setData({ playing: false })
        this.notice('这段语音暂时无法播放')
      })
    }
  },
  goBack() {
    if (this.data.openedFromRecord) {
      wx.redirectTo({
        url: `/pages/hall/hall?hall=${encodeURIComponent(this.data.returnHall || '主馆')}`
      })
      return
    }

    wx.navigateBack({
      fail: () => wx.redirectTo({
        url: `/pages/hall/hall?hall=${encodeURIComponent(this.data.returnHall || '主馆')}`
      })
    })
  },
  toggleAudio() {
    const playing = !this.data.playing
    this.setData({ playing })

    if (this.audioContext) {
      if (playing) this.audioContext.play()
      else this.audioContext.pause()
      return
    }

    this.notice(playing ? '演示语音正在播放' : '语音已暂停')
  },
  onUnload() {
    if (this.audioContext) this.audioContext.destroy()
  },
  editItem() {
    this.notice('进入编辑模式')
  },
  comment() {
    wx.showModal({
      title: '写下留言',
      editable: true,
      placeholderText: '记录此刻的感受',
      confirmText: '发布',
      success: ({ confirm, content }) => {
        if (confirm && content) this.notice('留言已发布')
      }
    })
  },
  showActions() {
    wx.showActionSheet({
      itemList: ['编辑展品', '移动到其他展厅', '删除展品'],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.notice('进入编辑模式')
        if (tapIndex === 1) this.notice('请选择目标展厅')
        if (tapIndex === 2) this.confirmDelete()
      }
    })
  },
  confirmDelete() {
    const record = this.data.record
    if (!record || !record.id || this.data.deleting) return

    wx.showModal({
      title: '删除展品',
      content: '确定要删除吗？删除后无法恢复。',
      cancelText: '取消',
      confirmText: '删除',
      confirmColor: '#8a5d3b',
      success: async ({ confirm }) => {
        if (!confirm || this.data.deleting) return

        this.setData({ deleting: true })
        try {
          await deleteItem(record.id)
          wx.showToast({ title: '展品已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 600)
        } catch (error) {
          this.setData({ deleting: false })
          this.notice('删除失败，请重试')
        }
      }
    })
  },
  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1600)
  },
  onShareAppMessage() {
    const id = this.data.record && this.data.record.id
      ? `&id=${this.data.record.id}`
      : ''
    return { title: '人生博物馆 · 展品详情', path: `/pages/detail/detail?type=${this.data.type}${id}` }
  }
})
