const storage = require('./storage-adapter')

const COMMENT_STORAGE_KEY = 'museum:private-comments:v1'
const VIEWER_STORAGE_KEY = 'museum:comment-viewer:v1'

const getViewerId = async () => {
  let viewerId = await storage.get(VIEWER_STORAGE_KEY)
  if (viewerId) return viewerId
  viewerId = `viewer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  await storage.set(VIEWER_STORAGE_KEY, viewerId)
  return viewerId
}

const getStoredComments = async () => {
  const comments = await storage.get(COMMENT_STORAGE_KEY)
  return Array.isArray(comments) ? comments : []
}

const getComments = async ({ itemId, ownerView }) => {
  const comments = (await getStoredComments()).filter((comment) => comment.itemId === itemId)
  if (ownerView) return comments.sort((a, b) => b.createdAt - a.createdAt)

  const viewerId = await getViewerId()
  return comments
    .filter((comment) => comment.viewerId === viewerId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

const addComment = async ({ itemId, content }) => {
  const viewerId = await getViewerId()
  const comments = await getStoredComments()
  const comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    viewerId,
    content: String(content || '').trim(),
    createdAt: Date.now()
  }
  if (!comment.itemId || !comment.content) throw new Error('Invalid comment')
  await storage.set(COMMENT_STORAGE_KEY, [...comments, comment])
  return comment
}

module.exports = {
  COMMENT_STORAGE_KEY,
  VIEWER_STORAGE_KEY,
  getComments,
  addComment
}
