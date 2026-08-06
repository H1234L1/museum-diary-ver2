const {
  startAppSession,
  endAppSession
} = require('./services/tracking-service')

if (wx.cloud) {
  wx.cloud.init({
    env: 'eduction-cloud1-6golagre0af9d5e5',
    traceUser: true
  })
}

App({
  globalData: {
    currentUser: null
  },

  onShow() {
    startAppSession().catch(() => {})
  },

  onHide() {
    endAppSession().catch(() => {})
  }
})
