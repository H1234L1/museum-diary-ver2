const { loginOrCreateUser, uploadAvatar, updateUserProfile } = require('../../services/auth-service')

Component({
  properties: {
    visible: { type: Boolean, value: false },
    purpose: { type: String, value: '建立你的馆主账号' }
  },
  data: { displayName: '', avatarPath: '', saving: false, choosingAvatar: false },
  observers: {
    visible(visible) {
      if (!visible) return
      const user = getApp().globalData.currentUser || {}
      this.setData({
        displayName: user.displayName || '',
        avatarPath: user.avatarFileId || '',
        saving: false,
        choosingAvatar: false
      })
    }
  },
  methods: {
    noop() {},
    cancel() {
      if (!this.data.saving) this.triggerEvent('cancel')
    },
    beginChooseAvatar() {
      if (this.data.choosingAvatar) return
      this.setData({ choosingAvatar: true })
      if (this.chooseAvatarTimer) clearTimeout(this.chooseAvatarTimer)
      this.chooseAvatarTimer = setTimeout(() => {
        this.setData({ choosingAvatar: false })
      }, 5000)
    },
    chooseAvatar(e) {
      if (this.chooseAvatarTimer) clearTimeout(this.chooseAvatarTimer)
      this.setData({ avatarPath: e.detail.avatarUrl || '', choosingAvatar: false })
    },
    updateName(e) {
      this.setData({ displayName: e.detail.value })
    },
    async submit() {
      const displayName = this.data.displayName.trim()
      if (!this.data.avatarPath) return wx.showToast({ title: '请选择微信头像', icon: 'none' })
      if (!displayName) return wx.showToast({ title: '请填写昵称', icon: 'none' })
      if (this.data.saving || this.data.choosingAvatar) return

      this.setData({ saving: true })
      try {
        await loginOrCreateUser()
        const avatarFileId = await uploadAvatar(this.data.avatarPath)
        const user = await updateUserProfile({ displayName, avatarFileId })
        getApp().globalData.currentUser = user
        this.setData({ saving: false, avatarPath: avatarFileId })
        this.triggerEvent('success', { user })
      } catch (error) {
        console.error('Account setup failed', error)
        this.setData({ saving: false })
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    }
  }
})
