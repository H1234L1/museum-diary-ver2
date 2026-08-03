const pad = (value) => String(value).padStart(2, '0')
const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const formatDateText = (value) => {
  const [year, month, day] = value.split('-')
  return `${year} 年 ${month} 月 ${day} 日`
}
const today = formatDate(new Date())
const { getUser, addItem } = require('../../services/user-service')

let recorderManager = null
let voicePressActive = false
let voiceStartY = 0
let discardNextRecording = false

Page({
  data: {
    date: today,
    dateText: formatDateText(today),
    day: today.slice(-2),
    image: '',
    story: '',
    hall: '主馆',
    voiceMode: false,
    recording: false,
    cancelling: false,
    audio: '',
    textBoxHeight: 41,
    textBoxMinHeight: 41,
    textBoxMaxHeight: 180,
    textLineHeight: 22,
    voiceButtonText: '按住 说话',
    keyboardKeys: Array.from({ length: 12 }, (_, index) => index),
    toast: ''
  },

  onLoad(options = {}) {
    let hall = '主馆'
    if (options.hall) {
      try {
        hall = decodeURIComponent(options.hall)
      } catch (error) {
        hall = options.hall
      }
    }
    this.setData({ hall })

  beginRecording() {
    if (!recorderManager) {
      this.notice('当前微信版本暂不支持录音')
      return
    }

    wx.authorize({
      scope: 'scope.record',
      success: () => recorderManager.start({
        duration: 600000,
        sampleRate: 44100,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      }),
      fail: () => {
        voicePressActive = false
        this.setData({ cancelling: false, voiceButtonText: '按住 说话' })
        wx.showModal({
          title: '需要麦克风权限',
          content: '开启麦克风权限后，才可以把声音收藏进博物馆。',
          confirmText: '去设置',
          success: ({ confirm }) => {
            if (confirm) wx.openSetting()
          }
        })
      }
    })
  },

  openDrafts() {
    this.notice('草稿箱将在保存草稿后显示内容')
  },

  setStory(e) {
    this.setData({ story: e.detail.value })
  },

  calculateTextBoxLimit() {
    const windowInfo = wx.getWindowInfo
      ? wx.getWindowInfo()
      : wx.getSystemInfoSync()
    const rpxToPx = windowInfo.windowWidth / 750

    wx.createSelectorQuery()
      .select('.composer')
      .boundingClientRect((rect) => {
        if (!rect) return

        const navigationHeight = 120 * rpxToPx
        const contentBelowComposer = 235 * rpxToPx
        const availableHeight = windowInfo.windowHeight
          - rect.top
          - navigationHeight
          - contentBelowComposer
        const minimumHeight = 82 * rpxToPx
        const maximumHeight = Math.max(minimumHeight, availableHeight)

        this.setData({
          textBoxHeight: minimumHeight,
          textBoxMinHeight: minimumHeight,
          textBoxMaxHeight: maximumHeight,
          textLineHeight: 44 * rpxToPx
        })
      })
      .exec()
  },

  resizeStoryInput(e) {
    const lineCount = Math.max(1, Number(e.detail.lineCount) || 1)
    const desiredHeight = this.data.textBoxMinHeight
      + (lineCount - 1) * this.data.textLineHeight
    const textBoxHeight = Math.min(this.data.textBoxMaxHeight, desiredHeight)

    if (Math.abs(textBoxHeight - this.data.textBoxHeight) < 1) return
    this.setData({ textBoxHeight })
  },

  persistFile(tempFilePath, done) {
    if (!tempFilePath || !wx.getFileSystemManager) {
      done(tempFilePath)
      return
    }

    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: ({ savedFilePath }) => done(savedFilePath),
      fail: () => done(tempFilePath)
    })
  },

  requestAudioTitle() {
    return new Promise((resolve) => {
      const openTitleDialog = () => {
        wx.showModal({
          title: '为声音命名',
          content: '',
          editable: true,
          placeholderText: '请输入语音展品标题',
          cancelText: '取消',
          confirmText: '确定',
          success: ({ confirm, content }) => {
            if (!confirm) {
              resolve('')
              return
            }

            const title = (content || '').trim()
            if (title) {
              resolve(title)
              return
            }

            wx.showToast({ title: '请先填写标题', icon: 'none' })
            setTimeout(openTitleDialog, 350)
          },
          fail: () => resolve('')
        })
      }

      openTitleDialog()
    })
  },

  async save() {
    if (this.data.recording) {
      this.notice('请先轻触结束录音')
      return
    }

    if (!this.data.image && !this.data.story.trim() && !this.data.audio) {
      this.notice('先放一张照片、写点什么，或留下一段声音吧')
      return
    }

    const story = this.data.story.trim()
    const type = this.data.image ? 'photo' : (this.data.audio ? 'audio' : 'text')
    let title = ''

    if (this.data.audio && !story) {
      title = await this.requestAudioTitle()
      if (!title) return
    }

    const record = {
      id: `exhibit-${Date.now()}`,
      title,
      date: this.data.date,
      image: this.data.image,
      story,
      audio: this.data.audio,
      hall: this.data.hall || '主馆',
      type,
      createdAt: Date.now()
    }

    try {
      const user = await getUser()
      if (!user) {
        wx.reLaunch({ url: '/pages/onboarding/onboarding' })
        return
      }
      await addItem(record)
    } catch (error) {
      this.notice('保存失败，请稍后再试')
      return
    }

    const destinationHall = record.hall || '主馆'
    wx.showToast({ title: `已收藏到${destinationHall}`, icon: 'success' })
    setTimeout(() => {
      wx.redirectTo({
        url: `/pages/detail/detail?type=${type}&id=${record.id}&from=record&hall=${encodeURIComponent(destinationHall)}`
      })
    }, 700)
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
