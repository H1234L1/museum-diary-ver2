const { TUTORIAL_STEPS } = require('../../config/tutorial-steps')
const {
  getTutorialState,
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
        const state = await getTutorialState()
        const step = TUTORIAL_STEPS[state.stepIndex]
        const visible = state.status === 'active' && step && step.route === getCurrentRoute()
        this.setData({
          visible,
          moving: false,
          focusing: false,
          step: visible ? step : {},
          stepNumber: state.stepIndex + 1
        })
      } catch (error) {
        this.setData({ visible: false, moving: false, focusing: false })
      }
    },

    next() {
      if (this.data.moving || !this.data.step.id) return
      this.setData({ moving: true })
      this.locateTarget(0)
    },

    locateTarget(attempt) {
      const step = this.data.step
      const currentPage = getCurrentPage()
      if (!step.targetSelector || !currentPage) {
        this.focusFailed()
        return
      }

      const query = wx.createSelectorQuery()
      if (query.in) query.in(currentPage)
      query.select(step.targetSelector).boundingClientRect((rect) => {
        if (!rect) {
          this.focusFailed()
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
        if (step.final) await completeTutorial()
        else await advanceTutorial()
        this.setData({ visible: false, moving: false, focusing: false })
        this.triggerEvent('action', { stepId: step.id })
      } catch (error) {
        this.setData({ moving: false })
        wx.showToast({ title: '引导暂时无法继续', icon: 'none' })
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
