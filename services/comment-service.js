const callFunction = (name, data) => wx.cloud.callFunction({ name, data })

const getComments = async ({ itemId, shareToken }) => {
  const response = await callFunction('getPrivateComments', {
    itemId: String(itemId || '').trim(),
    token: String(shareToken || '').trim()
  })
  const comments = response.result && response.result.comments
  return Array.isArray(comments) ? comments : []
}

const addComment = async ({ shareToken, content }) => {
  const token = String(shareToken || '').trim()
  const normalizedContent = String(content || '').trim()
  if (!token || !normalizedContent) throw new Error('Invalid comment')

  const response = await callFunction('addPrivateComment', {
    token,
    content: normalizedContent
  })
  return response.result && response.result.comment
}

module.exports = {
  getComments,
  addComment
}
