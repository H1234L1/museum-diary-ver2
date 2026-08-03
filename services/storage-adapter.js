const get = async (key) => wx.getStorageSync(key)

const set = async (key, value) => {
  wx.setStorageSync(key, value)
  return value
}

const remove = async (key) => {
  wx.removeStorageSync(key)
}

module.exports = {
  get,
  set,
  remove
}
