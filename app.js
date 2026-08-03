const {
  startAppSession,
  endAppSession
} = require('./services/tracking-service')

App({
  onShow() {
    startAppSession().catch(() => {})
  },

  onHide() {
    endAppSession().catch(() => {})
  }
})
