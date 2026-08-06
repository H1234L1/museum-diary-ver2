const { getUser, deleteItem } = require('../../services/user-service')
const { getComments, addComment } = require('../../services/comment-service')
const { createShare, getSharedEntry } = require('../../services/share-service')

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
    recordEntrance: false,
    openedAfterEdit: false,
    returnHall: '主馆',
    returnHallId: '',
    playing: false,
    deleting: false,
    actionsMenuVisible: false,
    commentsVisible: false,
    isSharedViewer: false,
    commentDraft: '',
    visitorName: '',
    comments: [],
    commentSubmitting: false,
    shareToken: '',
    shareId: '',
    sharePreparing: false,
    shareError: '',
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
      ),
      recordEntrance: options.from === 'record'
    })

    if (options.token) {
      try {
        const shared = await getSharedEntry(options.token)
        const record = shared.entry
        const story = record.story ? String(record.story) : ''
        const storyLines = story ? story.split(/\r?\n/) : []
        const type = ['photo', 'text', 'audio'].includes(record.type) ? record.type : 'text'

        this.setData({
          type,
          itemId: record.id || '',
          record,
          displayDate: record.date ? record.date.replace(/-/g, '.') : '',
          exhibitNumber: record.exhibitNumber || '----',
          photoStoryExpandable: type === 'photo' && (
            storyLines.length > 3 || Array.from(story).length > 54
          ),
          isSharedViewer: !shared.isOwner,
          shareToken: options.token,
          shareId: shared.shareId || '',
          returnHall: record.hall || '主馆'
        })
        const visitorName = wx.getStorageSync(`museum:visitor-name:${options.token}`) || ''
        this.setData({ visitorName })
        this.setupAudio(record)
        return
      } catch (error) {
        this.notice('这件展品暂时无法打开')
        return
      }
    }

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
      openedAfterEdit: options.afterEdit === '1',
      returnHall: (record && record.hall) || options.hall || '主馆',
      returnHallId: (record && record.hallId) || options.hallId || ''
    })

    this.setupAudio(record)
  },
  setupAudio(record) {
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
    if (this.data.openedAfterEdit) {
      const hall = encodeURIComponent(this.data.returnHall || '主馆')
      const hallId = this.data.returnHallId
        ? `&hallId=${encodeURIComponent(this.data.returnHallId)}`
        : ''
      wx.redirectTo({ url: `/pages/showcase/showcase?hall=${hall}${hallId}` })
      return
    }
    if (this.data.openedFromRecord) {
      const hallId = this.data.returnHallId
        ? `&hallId=${encodeURIComponent(this.data.returnHallId)}`
        : ''
      wx.redirectTo({
        url: `/pages/hall/hall?hall=${encodeURIComponent(this.data.returnHall || '主馆')}${hallId}&fromRecord=1`
      })
      return
    }

    wx.navigateBack({
      fail: () => wx.redirectTo({
        url: `/pages/hall/hall?hall=${encodeURIComponent(this.data.returnHall || '主馆')}`
      })
    })
  },
  goMainHall() {
    const fromRecord = this.data.openedFromRecord ? '&fromRecord=1' : ''
    wx.redirectTo({ url: `/pages/showcase/showcase?hall=%E4%B8%BB%E9%A6%86${fromRecord}` })
  },
  goRecordHall() {
    const hall = encodeURIComponent(this.data.returnHall || '主馆')
    const hallId = this.data.returnHallId
      ? `&hallId=${encodeURIComponent(this.data.returnHallId)}`
      : ''
    const fromRecord = this.data.openedFromRecord ? '&fromRecord=1' : ''
    wx.redirectTo({ url: `/pages/showcase/showcase?hall=${hall}${hallId}${fromRecord}` })
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
    wx.navigateTo({ url: `/pages/record/record?edit=${encodeURIComponent(id)}` })
  },
  async comment() {
    const itemId = this.data.itemId
    if (!itemId) {
      this.notice('暂时找不到这件展品')
      return
    }
    try {
      const comments = await getComments({
        itemId,
        shareToken: this.data.shareToken
      })
      this.setData({
        commentsVisible: true,
        comments: comments.map((item) => ({
          ...item,
          displayTime: formatCommentTime(item.createdAt)
        }))
      })
    } catch (error) {
      console.error('getComments failed', error)
      this.notice('留言暂时无法打开')
    }
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
  updateVisitorName(e) {
    this.setData({ visitorName: e.detail.value })
  },
  async submitComment() {
    const content = this.data.commentDraft.trim()
    const authorName = this.data.visitorName.trim()
    const itemId = this.data.itemId
    if (!authorName) {
      this.notice('请先填写留言署名')
      return
    }
    if (!content || !itemId || this.data.commentSubmitting || !this.data.isSharedViewer) return

    this.setData({ commentSubmitting: true })
    try {
      await addComment({ shareToken: this.data.shareToken, content, authorName })
      wx.setStorageSync(`museum:visitor-name:${this.data.shareToken}`, authorName)
      const comments = await getComments({
        itemId,
        shareToken: this.data.shareToken
      })
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
    const actionsMenuVisible = !this.data.actionsMenuVisible
    this.setData({ actionsMenuVisible })
    if (actionsMenuVisible && !this.data.shareToken && !this.data.sharePreparing) {
      this.prepareShare()
    }
  },
  async prepareShare() {
    const record = this.data.record
    if (!record || !record.id || this.data.sharePreparing) return

    this.setData({ sharePreparing: true, shareError: '' })
    try {
      const share = await createShare({
        record,
        exhibitNumber: this.data.exhibitNumber
      })
      this.setData({
        shareToken: share.token,
        shareId: share.shareId,
        sharePreparing: false
      })
    } catch (error) {
      console.error('prepareShare failed', error)
      this.setData({ sharePreparing: false, shareError: error.message || 'SHARE_FAILED' })
      this.notice('分享准备失败，请重试')
    }
  },
  handleShareTap() {
    if (this.data.sharePreparing) this.notice('正在准备展品，请稍候')
    else if (!this.data.shareToken) this.prepareShare()
    else this.closeActionsMenu()
  },
  closeActionsMenu() {
    this.setData({ actionsMenuVisible: false })
  },
  confirmDelete() {
    this.setData({ actionsMenuVisible: false })
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
    const token = this.data.shareToken
    return {
      title: '人生博物馆 · 展品详情',
      path: token
        ? `/pages/detail/detail?token=${encodeURIComponent(token)}`
        : '/pages/index/index'
    }
  }
})
