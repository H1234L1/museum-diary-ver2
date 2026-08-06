const pad = (value) => String(value).padStart(2, '0')
const formatDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = formatDate(new Date())
const { getUser, addItem, updateItem, createHall } = require('../../services/user-service')
const { createSpeechRecognitionManager } = require('../../services/speech-recognition-service')
const { getTutorialState } = require('../../services/tutorial-service')
const { TUTORIAL_STEPS } = require('../../config/tutorial-steps')

let recorderManager = null
let speechRecognitionAvailable = false
let recorderStopping = false
let recordingStartedAt = 0

Page({
  data: {
    date: today,
    statusBarHeight: 20,
    navigationBarHeight: 44,
    image: '',
    story: '',
    storyFocused: false,
    hall: '主馆',
    hallId: '',
    hallOptions: [{ id: '', name: '主馆' }],
    selectedHallIndex: 0,
    hallOptionListHeight: 105,
    hallSelectorVisible: false,
    hallCreatorVisible: false,
    newHallName: '',
    newHallDescription: '',
    selectedCover: '',
    coverOptions: [],
    creatingHall: false,
    isEditing: false,
    editingId: '',
    originalTitle: '',
    originalType: 'photo',
    voiceMode: false,
    recording: false,
    audio: '',
    audioDurationMs: 0,
    pendingAudio: '',
    pendingAudioDurationMs: 0,
    pendingTranscript: '',
    liveTranscript: '',
    voiceDecisionVisible: false,
    speechRecognitionAvailable: false,
    textBoxHeight: 41,
    textBoxMinHeight: 41,
    textBoxMaxHeight: 180,
    textLineHeight: 22,
    voiceButtonText: '按住 说话',
    keyboardKeys: Array.from({ length: 12 }, (_, index) => index),
    tutorialTextCompleted: false,
    tutorialPhotoPickerVisible: false,
    audioTitleDialogVisible: false,
    audioTitleDraft: '',
    toast: ''
  },

  async onLoad(options = {}) {
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

    let hall = '主馆'
    if (options.hall) {
      try {
        hall = decodeURIComponent(options.hall)
      } catch (error) {
        hall = options.hall
      }
    }
    const editingId = options.edit ? decodeURIComponent(options.edit) : ''
    if (editingId) {
      const user = await getUser()
      const existing = user && user.items.find((item) => item.id === editingId)
      if (!existing) {
        wx.showToast({ title: '找不到这件展品', icon: 'none' })
        setTimeout(() => wx.navigateBack(), 600)
        return
      }

      hall = existing.hall || hall
      this.setData({
        isEditing: true,
        editingId,
        originalTitle: existing.title || '',
        originalType: existing.type || 'photo',
        date: /^\d{4}-\d{2}-\d{2}$/.test(existing.date || '') ? existing.date : today,
        image: existing.image || '',
        story: existing.story || '',
        hall,
        hallId: existing.hallId || '',
        voiceMode: existing.type === 'audio',
        audio: existing.audio || '',
        audioDurationMs: Math.max(0, Number(existing.audioDurationMs) || 0),
        voiceButtonText: existing.audio ? '录音完成' : '轻触开始录音'
      })
    } else {
      this.setData({ hall })
    }
    this.loadHallOptions(hall)

    const speechManager = createSpeechRecognitionManager()
    recorderManager = speechManager.manager
    speechRecognitionAvailable = speechManager.supportsRecognition
    this.setData({ speechRecognitionAvailable })
    if (!recorderManager) return

    this.handleRecorderStart = () => {
      recorderStopping = false
      recordingStartedAt = Date.now()
      this.setData({
        recording: true,
        liveTranscript: '',
        voiceButtonText: '录音中 · 轻触结束'
      })
    }
    this.handleRecorderRecognize = ({ result = '' } = {}) => {
      if (result) this.setData({ liveTranscript: result })
    }
    this.handleRecorderStop = (result = {}) => {
      recorderStopping = false
      const measuredDuration = recordingStartedAt ? Date.now() - recordingStartedAt : 0
      recordingStartedAt = 0
      const pendingAudio = result.tempFilePath || result.filePath || ''
      const pendingTranscript = String(result.result || this.data.liveTranscript || '').trim()

      if (!pendingAudio) {
        this.setData({
          recording: false,
          liveTranscript: '',
          voiceButtonText: this.data.audio ? '录音完成' : '轻触开始录音'
        })
        this.notice('没有录到声音，请再试一次')
        return
      }

      const audioDurationMs = Math.max(0, Number(result.duration) || measuredDuration)
      this.persistFile(pendingAudio, (audio) => {
        this.setData({
          recording: false,
          audio,
          audioDurationMs,
          pendingAudio: '',
          pendingAudioDurationMs: 0,
          pendingTranscript: '',
          liveTranscript: '',
          voiceDecisionVisible: false,
          voiceButtonText: '录音完成'
        })
      })
    }
    this.handleRecorderError = () => {
      recorderStopping = false
      recordingStartedAt = 0
      this.setData({
        recording: false,
        liveTranscript: '',
        voiceButtonText: this.data.audio ? '录音完成' : '轻触开始录音'
      })
      this.notice('录音没有成功，请检查麦克风权限')
    }

    recorderManager.onStart(this.handleRecorderStart)
    if (recorderManager.onRecognize) recorderManager.onRecognize(this.handleRecorderRecognize)
    recorderManager.onStop(this.handleRecorderStop)
    recorderManager.onError(this.handleRecorderError)
  },

  onReady() {
    this.calculateTextBoxLimit()
  },

  exitEdit() {
    if (!this.data.isEditing) return
    wx.navigateBack({
      fail: () => wx.redirectTo({
        url: `/pages/detail/detail?type=${this.data.originalType}&id=${encodeURIComponent(this.data.editingId)}`
      })
    })
  },

  onUnload() {
    if (this.tutorialWritingTimer) clearTimeout(this.tutorialWritingTimer)
    if (this.data.recording && recorderManager) recorderManager.stop()
    if (!recorderManager) return

    if (recorderManager.offStart) recorderManager.offStart(this.handleRecorderStart)
    if (recorderManager.offRecognize) recorderManager.offRecognize(this.handleRecorderRecognize)
    if (recorderManager.offStop) recorderManager.offStop(this.handleRecorderStop)
    if (recorderManager.offError) recorderManager.offError(this.handleRecorderError)
    recorderManager = null
  },

  async loadHallOptions(preferredHall = '主馆') {
    try {
      const user = await getUser()
      const hallOptions = [
        { id: '', name: '主馆' },
        ...((user && user.halls) || []).map((hall) => ({
          id: hall.id || '',
          name: hall.name
        }))
      ]
      const selectedHallIndex = Math.max(
        0,
        hallOptions.findIndex((hall) => hall.name === preferredHall)
      )
      const selectedHall = hallOptions[selectedHallIndex]
      const coverOptions = ((user && user.items) || [])
        .filter((item) => item.image)
        .reduce((images, item) => images.includes(item.image) ? images : [...images, item.image], [])
        .slice(0, 12)

      this.setData({
        hallOptions,
        coverOptions,
        selectedHallIndex,
        hallOptionListHeight: Math.min(380, hallOptions.length * 105),
        hall: selectedHall.name,
        hallId: selectedHall.id
      })
    } catch (error) {
      this.setData({
        hallOptions: [{ id: '', name: '主馆' }],
        selectedHallIndex: 0,
        hallOptionListHeight: 105,
        hall: '主馆',
        hallId: ''
      })
    }
  },

  openHallSelector() {
    this.setData({ hallSelectorVisible: true })
  },

  closeHallSelector() {
    this.setData({ hallSelectorVisible: false })
    this.refreshGuide()
  },

  stopPropagation() {},

  selectHall(e) {
    const selectedHallIndex = Number(e.currentTarget.dataset.index) || 0
    const selectedHall = this.data.hallOptions[selectedHallIndex]
    if (!selectedHall) return

    this.setData({
      selectedHallIndex,
      hall: selectedHall.name,
      hallId: selectedHall.id || '',
      hallSelectorVisible: false
    })
    if (selectedHall.name === '主馆') this.completeGuideStep('select-main-hall')
  },

  openHallCreator() {
    this.setData({
      hallSelectorVisible: false,
      hallCreatorVisible: true,
      newHallName: '',
      newHallDescription: '',
      selectedCover: '',
      creatingHall: false
    })
  },

  closeHallCreator() {
    if (this.data.creatingHall) return
    this.setData({ hallCreatorVisible: false, hallSelectorVisible: true })
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

  async submitNewHall() {
    const name = this.data.newHallName.trim()
    if (!name) {
      wx.showToast({ title: '请先为副馆取一个名字', icon: 'none' })
      return
    }
    if (this.data.creatingHall) return

    this.setData({ creatingHall: true })
    try {
      const hall = await createHall({
        name,
        description: this.data.newHallDescription,
        coverImage: this.data.selectedCover
      })
      await this.loadHallOptions(hall.name)
      this.setData({
        creatingHall: false,
        hallCreatorVisible: false,
        hallSelectorVisible: false
      })
      wx.showToast({ title: `已创建并选择${hall.name}`, icon: 'success' })
      this.refreshGuide()
    } catch (error) {
      this.setData({ creatingHall: false })
      wx.showToast({
        title: error.message === 'Hall name already exists' ? '已经有同名副馆了' : '创建失败，请重试',
        icon: 'none'
      })
    }
  },

  async chooseImage() {
    const tutorialState = await getTutorialState().catch(() => null)
    const tutorialStep = tutorialState && TUTORIAL_STEPS[tutorialState.stepIndex]
    if (tutorialState && tutorialState.status === 'active' && tutorialStep && tutorialStep.id === 'add-first-photo') {
      this.openTutorialPhotoPicker()
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: ({ tempFiles }) => {
        this.persistFile(tempFiles[0].tempFilePath, (image) => {
          this.setData({ image })
          this.completeGuideStep('add-first-photo')
        })
      },
      fail: () => this.refreshGuide()
    })
  },

  openTutorialPhotoPicker() {
    this.setData({ tutorialPhotoPickerVisible: true })
  },

  closeTutorialPhotoPicker() {
    this.setData({ tutorialPhotoPickerVisible: false })
    this.refreshGuide()
  },

  confirmTutorialPhoto() {
    this.setData({
      image: '/assets/art/home-hero.jpg',
      tutorialPhotoPickerVisible: false
    })
    this.completeGuideStep('add-first-photo')
  },

  toggleVoiceMode() {
    if (this.data.recording) {
      this.notice('请先轻触结束录音')
      return
    }
    this.setData({
      voiceMode: !this.data.voiceMode,
      voiceButtonText: this.data.audio ? '录音完成' : '轻触开始录音'
    })
  },

  handleVoiceTap() {
    if (!recorderManager) {
      if (!recorderManager) this.notice('当前微信版本暂不支持录音')
      return
    }

    if (recorderStopping) return
    if (this.data.recording) {
      recorderStopping = true
      this.setData({ voiceButtonText: '正在结束录音…' })
      recorderManager.stop()
      return
    }

    this.beginRecording()
  },

  keepVoice() {
    const pendingAudio = this.data.pendingAudio
    if (!pendingAudio) {
      this.notice('这段录音暂时无法保留，请重新录制')
      return
    }

    this.persistFile(pendingAudio, (audio) => {
      this.setData({
        audio,
        audioDurationMs: this.data.pendingAudioDurationMs,
        pendingAudio: '',
        pendingAudioDurationMs: 0,
        pendingTranscript: '',
        voiceDecisionVisible: false,
        voiceButtonText: '录音完成'
      })
    })
  },

  convertVoiceToText() {
    if (!speechRecognitionAvailable) {
      this.notice('请先在微信后台启用语音识别插件')
      return
    }

    const transcript = this.data.pendingTranscript.trim()
    if (!transcript) {
      this.notice('没有识别到文字，可以保留语音或重新录制')
      return
    }

    const currentStory = this.data.story.trimEnd()
    const story = currentStory ? `${currentStory}\n${transcript}` : transcript
    this.setData({
      story,
      storyFocused: true,
      voiceMode: false,
      audio: '',
      audioDurationMs: 0,
      pendingAudio: '',
      pendingAudioDurationMs: 0,
      pendingTranscript: '',
      voiceDecisionVisible: false,
      voiceButtonText: '轻触开始录音'
    })
  },

  beginRecording() {
    if (!recorderManager) {
      this.notice('当前微信版本暂不支持录音')
      return
    }

    wx.authorize({
      scope: 'scope.record',
      success: () => {
        const recordingOptions = speechRecognitionAvailable
          ? { duration: 60000, lang: 'zh_CN' }
          : {
            duration: 60000,
            sampleRate: 44100,
            numberOfChannels: 1,
            encodeBitRate: 96000,
            format: 'mp3'
          }
        recorderManager.start(recordingOptions)
      },
      fail: () => {
        this.setData({ voiceButtonText: this.data.audio ? '录音完成' : '轻触开始录音' })
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
    const story = e.detail.value
    this.setData({ story })
    if (this.tutorialWritingTimer) clearTimeout(this.tutorialWritingTimer)
    if (!story.trim() || this.data.tutorialTextCompleted) return

    this.tutorialWritingTimer = setTimeout(async () => {
      if (!this.data.story.trim() || this.data.tutorialTextCompleted) return
      const completed = await this.completeGuideStep('write-first-text')
      if (!completed) return
      this.setData({
        tutorialTextCompleted: true,
        storyFocused: false,
        hallSelectorVisible: true
      })
    }, 1000)
  },

  handleStoryBlur() {
    this.setData({ storyFocused: false })
    if (!this.data.story.trim()) this.refreshGuide()
  },

  handleTutorialAction(e) {
    const { stepId } = e.detail
    if (stepId === 'add-first-photo') {
      this.openTutorialPhotoPicker()
    } else if (stepId === 'write-first-text') {
      this.setData({ voiceMode: false, storyFocused: true })
    } else if (stepId === 'select-main-hall') {
      if (!this.data.hallSelectorVisible) this.openHallSelector()
      else this.selectHall({ currentTarget: { dataset: { index: 0 } } })
    } else if (stepId === 'save-first-exhibit') {
      this.save()
    }
  },

  completeGuideStep(stepId) {
    const guide = this.selectComponent && this.selectComponent('#museumGuide')
    return guide && guide.completeStep ? guide.completeStep(stepId) : Promise.resolve(false)
  },

  refreshGuide() {
    const guide = this.selectComponent && this.selectComponent('#museumGuide')
    if (guide && guide.syncGuide) guide.syncGuide()
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
        const contentBelowComposer = 370 * rpxToPx
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
      this.audioTitleResolver = resolve
      this.setData({ audioTitleDialogVisible: true, audioTitleDraft: '' })
    })
  },

  updateAudioTitleDraft(e) {
    this.setData({ audioTitleDraft: e.detail.value })
  },

  finishAudioTitle(title) {
    const resolve = this.audioTitleResolver
    this.audioTitleResolver = null
    this.setData({ audioTitleDialogVisible: false, audioTitleDraft: '' })
    if (resolve) resolve(title)
  },

  confirmAudioTitle() {
    this.finishAudioTitle(this.data.audioTitleDraft.trim())
  },

  skipAudioTitle() {
    this.finishAudioTitle('')
  },

  cancelAudioTitle() {
    this.finishAudioTitle(null)
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
    let title = this.data.isEditing ? this.data.originalTitle : ''

    if (this.data.audio && !story && !title) {
      title = await this.requestAudioTitle()
      if (title === null) return
    }

    const record = {
      id: this.data.isEditing ? this.data.editingId : `exhibit-${Date.now()}`,
      title,
      date: this.data.date,
      image: this.data.image,
      story,
      audio: this.data.audio,
      audioDurationMs: this.data.audioDurationMs,
      hall: this.data.hall || '主馆',
      type,
      createdAt: Date.now()
    }
    if (this.data.hallId) record.hallId = this.data.hallId

    try {
      const user = await getUser()
      if (!user) {
        wx.reLaunch({ url: '/pages/onboarding/onboarding' })
        return
      }
      if (this.data.isEditing) await updateItem(record.id, record)
      else await addItem(record)
    } catch (error) {
      this.notice('保存失败，请稍后再试')
      return
    }

    if (!this.data.isEditing) await this.completeGuideStep('save-first-exhibit')

    const destinationHall = record.hall || '主馆'
    wx.showToast({
      title: this.data.isEditing ? '展品已更新' : `已收藏到${destinationHall}`,
      icon: 'success'
    })
    setTimeout(() => {
      const hallId = record.hallId ? `&hallId=${encodeURIComponent(record.hallId)}` : ''
      const url = `/pages/detail/detail?type=${type}&id=${record.id}&hall=${encodeURIComponent(destinationHall)}${hallId}`
      if (this.data.isEditing) {
        wx.reLaunch({ url: `${url}&afterEdit=1` })
      } else {
        wx.redirectTo({ url: `${url}&from=record` })
      }
    }, 700)
  },

  notice(toast) {
    this.setData({ toast })
    setTimeout(() => this.setData({ toast: '' }), 1800)
  }
})
