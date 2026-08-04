const { getUser, deleteItem } = require('../../services/user-service')
const { getComments, addComment } = require('../../services/comment-service')

const formatCommentTime = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

Page({
  data: {
    type: 'photo',
    itemId: '',
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
    actionsMenuVisible: false,
    commentsVisible: false,
    isSharedViewer: false,
    commentDraft: '',
    comments: [],
    commentSubmitting: false,
    photoStoryVisible: false,
    photoStoryExpandable: false,
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
    const story = record && record.story ? String(record.story) : ''
    const storyLines = story ? story.split(/\r?\n/) : []
    const photoStoryExpandable = type === 'photo' && (
      storyLines.length > 3 || Array.from(story).length > 54
    )

    this.setData({
      type,
      itemId: (record && record.id) || options.id || '',
      record,
      displayDate,
      exhibitNumber,
      photoStoryExpandable,
      isSharedViewer: options.shared === '1',
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
  handleTutorialAction(e) {
    if (e.detail.stepId === 'back-from-detail') this.goBack()
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
    this.setData({ actionsMenuVisible: false })
    const id = this.data.record && this.data.record.id
    if (!id) {
      this.notice('暂时找不到这件展品')
      return
    }
    wx.redirectTo({ url: `/pages/record/record?edit=${encodeURIComponent(id)}` })
  },
  async comment() {
    const itemId = this.data.itemId
    if (!itemId) {
      this.notice('暂时找不到这件展品')
      return
    }
    const comments = await getComments({ itemId, ownerView: !this.data.isSharedViewer })
    this.setData({
      commentsVisible: true,
      comments: comments.map((item) => ({
        ...item,
        displayTime: formatCommentTime(item.createdAt)
      }))
    })
  },
  closeComments() {
    this.setData({ commentsVisible: false, commentDraft: '' })
  },
  openPhotoStory() {
    if (!this.data.record || !this.data.record.story) return
    this.setData({ photoStoryVisible: true })
  },
  closePhotoStory() {
    this.setData({ photoStoryVisible: false })
  },
  noop() {},
  updateCommentDraft(e) {
    this.setData({ commentDraft: e.detail.value })
  },
  async submitComment() {
    const content = this.data.commentDraft.trim()
    const itemId = this.data.itemId
    if (!content || !itemId || this.data.commentSubmitting || !this.data.isSharedViewer) return

    this.setData({ commentSubmitting: true })
    try {
      await addComment({ itemId, content })
      const comments = await getComments({ itemId, ownerView: false })
      this.setData({
        commentDraft: '',
        commentSubmitting: false,
        comments: comments.map((item) => ({
          ...item,
          displayTime: formatCommentTime(item.createdAt)
        }))
      })
      this.notice('留言已送出')
    } catch (error) {
      this.setData({ commentSubmitting: false })
      this.notice('留言保存失败，请重试')
    }
  },
  toggleActionsMenu() {
    this.setData({ actionsMenuVisible: !this.data.actionsMenuVisible })
  },
  closeActionsMenu() {
    this.setData({ actionsMenuVisible: false })
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
    return {
      title: '人生博物馆 · 展品详情',
      path: `/pages/detail/detail?type=${this.data.type}${id}&shared=1`
    }
  }
})
