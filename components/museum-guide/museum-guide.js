const { TUTORIAL_STEPS } = require('../../config/tutorial-steps')
const {
  getTutorialState,
  startTutorial,
  advanceTutorial,
  skipTutorial,
  completeTutorial
} = require('../../services/tutorial-service')

const getCurrentPage = () => {
  const pages = getCurrentPages()
  return pages.length ? pages[pages.length - 1] : null
}

const getCurrentRoute = () => {
  const page = getCurrentPage()
  return page ? page.route : ''
}

Component({
  data: {
    visible: false,
    offerVisible: false,
    moving: false,
    focusing: false,
    step: {},
    stepNumber: 1,
    stepCount: TUTORIAL_STEPS.length,
    focusLeft: 0,
    focusTop: 0,
    focusRight: 0,
    focusBottom: 0,
    focusWidth: 0,
    focusHeight: 0,
    focusHintTop: 0
  },

  lifetimes: {
    attached() {
      this.syncGuide()
    },
    detached() {
      if (this.focusTimer) clearTimeout(this.focusTimer)
      if (this.autoFocusTimer) clearTimeout(this.autoFocusTimer)
      if (this.resyncTimer) clearTimeout(this.resyncTimer)
    }
  },

  pageLifetimes: {
    show() {
      this.syncGuide()
    }
  },

  methods: {
    async syncGuide() {
      try {
        if (this.autoFocusTimer) clearTimeout(this.autoFocusTimer)
        let state = await getTutorialState()
        if (state.status === 'offered') state = await startTutorial()
        const step = TUTORIAL_STEPS[state.stepIndex]
        const offerVisible = state.status === 'offered' && getCurrentRoute() === 'pages/index/index'
        const visible = state.status === 'active' && step && step.route === getCurrentRoute()
        this.setData({
          offerVisible,
          visible,
          moving: false,
          focusing: false,
          step: visible ? step : {},
          stepNumber: state.stepIndex + 1
        })
        if (visible) {
          this.autoFocusTimer = setTimeout(() => {
            if (this.data.visible && !this.data.focusing) {
              this.setData({ moving: true })
              this.locateTarget(0)
            }
          }, 80)
        }
      } catch (error) {
        this.setData({ offerVisible: false, visible: false, moving: false, focusing: false })
      }
    },

    async acceptTutorial() {
      if (this.data.moving) return
      this.setData({ moving: true })
      try {
        await startTutorial()
        await this.syncGuide()
      } catch (error) {
        this.setData({ moving: false })
        wx.showToast({ title: '暂时无法开启引导', icon: 'none' })
      }
    },

    async declineTutorial() {
      if (this.data.moving) return
      this.setData({ moving: true })
      try {
        await skipTutorial()
        this.setData({ offerVisible: false, visible: false, moving: false })
      } catch (error) {
        this.setData({ moving: false })
        wx.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
    },

    locateTarget(attempt) {
      const step = this.data.step
      const currentPage = getCurrentPage()
      if (!step.targetSelector || !currentPage) {
        this.focusFailed()
        return
      }

      let queryScope = currentPage
      if (step.targetComponent && currentPage.selectComponent) {
        queryScope = currentPage.selectComponent(step.targetComponent) || currentPage
      }
      const query = wx.createSelectorQuery()
      if (query.in) query.in(queryScope)
      query.select(step.targetSelector).boundingClientRect((rect) => {
        if (!rect) {
          if (attempt < 4) {
            this.focusTimer = setTimeout(() => this.locateTarget(attempt + 1), 220)
          } else {
            this.focusFailed()
          }
          return
        }

        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const outsideViewport = rect.bottom < 0 || rect.top > windowInfo.windowHeight
        if (outsideViewport && attempt === 0 && wx.pageScrollTo) {
          wx.pageScrollTo({
            selector: step.targetSelector,
            offsetTop: -150,
            duration: 250,
            complete: () => {
              this.focusTimer = setTimeout(() => this.locateTarget(1), 320)
            }
          })
          return
        }

        this.activateFocus(rect, windowInfo)
      }).exec()
    },

    activateFocus(rect, windowInfo) {
      const rpxToPx = windowInfo.windowWidth / 750
      const padding = (Number(this.data.step.targetPadding) || 8) * rpxToPx
      const edge = 7
      const focusLeft = Math.max(edge, rect.left - padding)
      const focusTop = Math.max(edge, rect.top - padding)
      const focusRight = Math.min(windowInfo.windowWidth - edge, rect.right + padding)
      const focusBottom = Math.min(windowInfo.windowHeight - edge, rect.bottom + padding)
      const focusWidth = focusRight - focusLeft
      const focusHeight = focusBottom - focusTop

      if (focusWidth < 20 || focusHeight < 20) {
        this.focusFailed()
        return
      }

      let focusHintTop = focusBottom + 14
      if (focusHintTop + 54 > windowInfo.windowHeight) focusHintTop = focusTop - 58
      focusHintTop = Math.max(12, focusHintTop)

      this.setData({
        moving: false,
        focusing: true,
        focusLeft,
        focusTop,
        focusRight,
        focusBottom,
        focusWidth,
        focusHeight,
        focusHintTop
      })
    },

    focusFailed() {
      this.setData({ moving: false, focusing: false })
      wx.showToast({ title: '暂时找不到操作位置，请重试', icon: 'none' })
    },

    remindFocusedAction() {
      wx.showToast({ title: '请点击亮起的区域继续', icon: 'none' })
    },

    async performFocusedAction() {
      if (this.data.moving || !this.data.focusing || !this.data.step.id) return
      this.setData({ moving: true })

      try {
        const step = this.data.step
        if (step.deferAdvance) {
          this.setData({ visible: false, moving: false, focusing: false })
          this.triggerEvent('action', { stepId: step.id })
          return
        }
        if (step.final) await completeTutorial()
        else await advanceTutorial()
        this.setData({ visible: false, moving: false, focusing: false })
        this.triggerEvent('action', { stepId: step.id })
        if (!step.final) {
          this.resyncTimer = setTimeout(() => this.syncGuide(), 420)
        }
      } catch (error) {
        this.setData({ moving: false })
        wx.showToast({ title: '引导暂时无法继续', icon: 'none' })
      }
    },

    async completeStep(stepId) {
      try {
        const state = await getTutorialState()
        const step = TUTORIAL_STEPS[state.stepIndex]
        if (state.status !== 'active' || !step || step.id !== stepId) return false
        if (step.final) await completeTutorial()
        else await advanceTutorial()
        await this.syncGuide()
        return true
      } catch (error) {
        return false
      }
    },

    skip() {
      if (this.data.moving || this.data.focusing) return
      wx.showModal({
        title: '跳过新手引导？',
        content: '你仍然可以自由使用收藏、展厅和月报功能。',
        cancelText: '继续看看',
        confirmText: '跳过',
        confirmColor: '#8a673b',
        success: async ({ confirm }) => {
          if (!confirm) return
          try {
            await skipTutorial()
            this.setData({ visible: false })
          } catch (error) {
            wx.showToast({ title: '操作失败，请重试', icon: 'none' })
          }
        }
      })
    }
  }
})
