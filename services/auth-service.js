const LOGGED_OUT_KEY = 'museum:account-logged-out:v1'

const loginOrCreateUser = async () => {
  if (!wx.cloud || !wx.cloud.callFunction) {
    throw new Error('CLOUD_UNAVAILABLE')
  }

  const response = await wx.cloud.callFunction({
    name: 'loginOrCreateUser'
  })
  const result = response && response.result
  if (!result || !result.user) throw new Error('INVALID_LOGIN_RESPONSE')
  wx.removeStorageSync(LOGGED_OUT_KEY)
  return result.user
}

const getCurrentUser = async () => {
  if (wx.getStorageSync(LOGGED_OUT_KEY)) return null
  if (!wx.cloud || !wx.cloud.callFunction) return null
  const response = await wx.cloud.callFunction({
    name: 'loginOrCreateUser',
    data: { create: false }
  })
  return (response && response.result && response.result.user) || null
}

const logout = () => {
  wx.setStorageSync(LOGGED_OUT_KEY, true)
  const app = getApp()
  if (app && app.globalData) app.globalData.currentUser = null
}

const uploadAvatar = async (tempFilePath) => {
  if (String(tempFilePath || '').startsWith('cloud://')) return tempFilePath
  const extensionMatch = String(tempFilePath || '').match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg'
  const cloudPath = `user-avatars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
  const result = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })
  if (!result.fileID) throw new Error('AVATAR_UPLOAD_FAILED')
  return result.fileID
}

const updateUserProfile = async ({ displayName, avatarFileId }) => {
  const response = await wx.cloud.callFunction({
    name: 'updateUserProfile',
    data: { displayName, avatarFileId }
  })
  const user = response && response.result && response.result.user
  if (!user) throw new Error('INVALID_PROFILE_RESPONSE')
  return user
}

module.exports = { getCurrentUser, loginOrCreateUser, logout, uploadAvatar, updateUserProfile }
