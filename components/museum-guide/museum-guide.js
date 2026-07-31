const { TUTORIAL_STEPS } = require('../../config/tutorial-steps')
const {
  getTutorialState,
  advanceTutorial,
  skipTutorial,
  completeTutorial
} = require('../../services/tutorial-service')

const getCurrentRoute = () => {
  const pages = getCurrentPages()
  return pages.length ? pages[pages.length - 1].route : ''
}

Component({
  data: {
    visible: false,
    moving: false,
    step: {},
    stepNumber: 1,
    stepCount: TUTORIAL_STEPS.length
  },

  lifetimes: {
    attached() {
      this.syncGuide()
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
          step: visible ? step : {},
          stepNumber: state.stepIndex + 1
        })
      } catch (error) {
        this.setData({ visible: false, moving: false })
      }
    },

    async next() {
      if (this.data.moving || !this.data.step.id) return
      this.setData({ moving: true })

      try {
        const step = this.data.step
        if (step.final) await completeTutorial()
        else await advanceTutorial()
        this.setData({ visible: false })
        wx.redirectTo({ url: step.nextUrl })
      } catch (error) {
        this.setData({ moving: false })
        wx.showToast({ title: '引导暂时无法继续', icon: 'none' })
      }
    },

    skip() {
      if (this.data.moving) return
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
