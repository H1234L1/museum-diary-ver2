const pad = (value) => String(value).padStart(2, '0')
const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const formatDateText = (value) => {
  const [year, month, day] = value.split('-')
  return `${year} 年 ${month} 月 ${day} 日`
}
const today = formatDate(new Date())
const { getUser, addItem } = require('../../services/user-service')

let recorderManager = null

Page({
  data: {
    date: today,
    dateText: formatDateText(today),
    day: today.slice(-2),
    image: '',
    story: '',
    hall: '主馆',
    recording: false,
    audio: '',
    voiceState: '轻触开始录音',
    waveBars: Array.from({ length: 16 }, (_, index) => index),
    toast: ''
  },

  onLoad() {
    if (!wx.getRecorderManager) return

    recorderManager = wx.getRecorderManager()
    this.handleRecorderStart = () => {
      this.setData({ recording: true, voiceState: '录音中 · 轻触结束' })
    }
    this.handleRecorderStop = ({ tempFilePath }) => {
      this.persistFile(tempFilePath, (audio) => {
        this.setData({ recording: false, audio, voiceState: '已录好 · 轻触重录' })
      })
    }
    this.handleRecorderError = () => {
      this.setData({ recording: false, voiceState: '轻触重新录音' })
      this.notice('录音没有成功，请检查麦克风权限')
    }

    recorderManager.onStart(this.handleRecorderStart)
    recorderManager.onStop(this.handleRecorderStop)
    recorderManager.onError(this.handleRecorderError)
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

  toggleRecord() {
    if (!recorderManager) {
      this.notice('当前微信版本暂不支持录音')
      return
    }

    if (this.data.recording) {
      recorderManager.stop()
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

  setStory(e) {
    this.setData({ story: e.detail.value })
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
      hall: '主馆',
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

    wx.showToast({ title: '已收藏到主馆', icon: 'success' })
    setTimeout(() => {
      wx.redirectTo({ url: `/pages/detail/detail?type=${type}&id=${record.id}` })
    }, 700)
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
