const createSpeechRecognitionManager = () => {
  // WechatSI is temporarily disabled because this Mini Program has not been
  // authorized to use provider wx069ba97219f66d99. Restore the plugin adapter
  // only after the permission has been granted in the WeChat Mini Program
  // management console.
  return {
    manager: wx.getRecorderManager ? wx.getRecorderManager() : null,
    supportsRecognition: false
  }
}

module.exports = {
  createSpeechRecognitionManager
}
