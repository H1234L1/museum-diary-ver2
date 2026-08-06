const callFunction = (name, data) => wx.cloud.callFunction({ name, data })

const getExtension = (filePath, fallback) => {
  const cleanPath = String(filePath || '').split('?')[0]
  const match = cleanPath.match(/\.([a-zA-Z0-9]{1,8})$/)
  return match ? match[1].toLowerCase() : fallback
}

const getUploadPath = async (filePath) => {
  if (!/^https?:\/\//.test(filePath)) return filePath

  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: filePath,
      success: ({ statusCode, tempFilePath }) => {
        if (statusCode >= 200 && statusCode < 300 && tempFilePath) resolve(tempFilePath)
        else reject(new Error('MEDIA_DOWNLOAD_FAILED'))
      },
      fail: reject
    })
  })
}

const uploadMedia = async ({ filePath, folder, fallbackExtension }) => {
  const value = String(filePath || '').trim()
  if (!value) return ''
  if (value.startsWith('cloud://')) return value

  const uploadPath = await getUploadPath(value)
  const extension = getExtension(value, fallbackExtension)
  const nonce = Math.random().toString(36).slice(2, 10)
  const cloudPath = `shared/${folder}/${Date.now()}-${nonce}.${extension}`
  const result = await wx.cloud.uploadFile({ cloudPath, filePath: uploadPath })
  return result.fileID
}

const createShare = async ({ record, exhibitNumber }) => {
  if (!record || !record.id) throw new Error('INVALID_ENTRY')

  const [imageFileId, audioFileId] = await Promise.all([
    record.type === 'photo'
      ? uploadMedia({ filePath: record.image, folder: 'images', fallbackExtension: 'jpg' })
      : '',
    record.type === 'audio'
      ? uploadMedia({ filePath: record.audio, folder: 'audio', fallbackExtension: 'mp3' })
      : ''
  ])

  const response = await callFunction('createShare', {
    entry: {
      id: record.id,
      type: record.type,
      title: record.title,
      date: record.date,
      story: record.story,
      hall: record.hall,
      imageFileId,
      audioFileId,
      exhibitNumber
    }
  })

  if (!response.result || !response.result.token) throw new Error('SHARE_CREATION_FAILED')
  return response.result
}

const getSharedEntry = async (token) => {
  const response = await callFunction('getSharedEntry', { token })
  if (!response.result || !response.result.entry) throw new Error('SHARED_ENTRY_NOT_FOUND')
  return response.result
}

module.exports = {
  createShare,
  getSharedEntry
}
