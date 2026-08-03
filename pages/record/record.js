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
    storyFocused: false,
    hall: '主馆',
    voiceMode: false,
    recording: false,
    cancelling: false,
    audio: '',
    audioDurationMs: 0,
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

    if (!wx.getRecorderManager) return

    recorderManager = wx.getRecorderManager()
    this.handleRecorderStart = () => {
      this.setData({
        recording: true,
        voiceButtonText: voicePressActive ? '松开 结束' : '正在结束…'
      })

      if (!voicePressActive) {
        discardNextRecording = true
        recorderManager.stop()
      }
    }
    this.handleRecorderStop = ({ tempFilePath, duration = 0 }) => {
      if (discardNextRecording) {
        discardNextRecording = false
        this.setData({
          recording: false,
          cancelling: false,
          voiceButtonText: this.data.audio ? '按住 重录' : '按住 说话'
        })
        return
      }

      this.persistFile(tempFilePath, (audio) => {
        this.setData({
          recording: false,
          cancelling: false,
          audio,
          audioDurationMs: Math.max(0, Number(duration) || 0),
          voiceButtonText: '已录好 · 按住重录'
        })
      })
    }
    this.handleRecorderError = () => {
      this.setData({ recording: false, cancelling: false, voiceButtonText: '按住 说话' })
      this.notice('录音没有成功，请检查麦克风权限')
    }

    recorderManager.onStart(this.handleRecorderStart)
    recorderManager.onStop(this.handleRecorderStop)
    recorderManager.onError(this.handleRecorderError)
  },

  onReady() {
    this.calculateTextBoxLimit()
  },

  onUnload() {
    if (this.data.recording && recorderManager) recorderManager.stop()
    if (!recorderManager) return

    if (recorderManager.offStart) recorderManager.offStart(this.handleRecorderStart)
    if (recorderManager.offStop) recorderManager.offStop(this.handleRecorderStop)
    if (recorderManager.offError) recorderManager.offError(this.handleRecorderError)
    recorderManager = null
  },

  changeDate(e) {
    const date = e.detail.value
    this.setData({
      date,
      dateText: formatDateText(date),
      day: date.slice(-2)
    })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: ({ tempFiles }) => {
        this.persistFile(tempFiles[0].tempFilePath, (image) => this.setData({ image }))
      }
    })
  },

  toggleVoiceMode() {
    if (this.data.recording) return
    this.setData({
      voiceMode: !this.data.voiceMode,
      cancelling: false,
      voiceButtonText: this.data.audio ? '已录好 · 按住重录' : '按住 说话'
    })
  },

  startVoicePress(e) {
    if (!recorderManager || this.data.recording) {
      if (!recorderManager) this.notice('当前微信版本暂不支持录音')
      return
    }

    voicePressActive = true
    discardNextRecording = false
    voiceStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0
    this.setData({ cancelling: false, voiceButtonText: '松开 结束' })
    this.beginRecording()
  },

  moveVoicePress(e) {
    if (!voicePressActive) return
    const currentY = e.touches && e.touches[0] ? e.touches[0].clientY : voiceStartY
    const cancelling = voiceStartY - currentY > 70
    if (cancelling === this.data.cancelling) return
    this.setData({
      cancelling,
      voiceButtonText: cancelling ? '松开 取消' : '松开 结束'
    })
  },

  endVoicePress() {
    if (!voicePressActive) return
    voicePressActive = false
    discardNextRecording = this.data.cancelling

    if (this.data.recording && recorderManager) {
      recorderManager.stop()
      return
    }

    this.setData({
      cancelling: false,
      voiceButtonText: this.data.audio ? '按住 重录' : '按住 说话'
    })
  },

  cancelVoicePress() {
    if (!voicePressActive) return
    voicePressActive = false
    discardNextRecording = true
    if (this.data.recording && recorderManager) recorderManager.stop()
    this.setData({ cancelling: false, voiceButtonText: '按住 说话' })
  },

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

  handleStoryBlur() {
    this.setData({ storyFocused: false })
  },

  handleTutorialAction(e) {
    if (e.detail.stepId !== 'learn-recording') return
    this.setData({ voiceMode: false, storyFocused: true })
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

  async save() {
    if (this.data.recording) {
      this.notice('请先轻触结束录音')
      return
    }

    if (!this.data.image && !this.data.story.trim() && !this.data.audio) {
      this.notice('先放一张照片、写点什么，或留下一段声音吧')
      return
    }

    const type = this.data.image ? 'photo' : (this.data.audio ? 'audio' : 'text')
    const record = {
      id: `exhibit-${Date.now()}`,
      title: this.data.story.trim().slice(0, 16) || `${this.data.date} 的收藏`,
      date: this.data.date,
      image: this.data.image,
      story: this.data.story.trim(),
      audio: this.data.audio,
      audioDurationMs: this.data.audioDurationMs,
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
