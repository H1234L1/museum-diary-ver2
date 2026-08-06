const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const getUserId = (openId) => `user_${crypto.createHash('sha256').update(openId).digest('hex')}`

const loadProfiles = async (comments) => {
  const openIds = [...new Set(comments.map((comment) => comment.authorOpenId).filter(Boolean))]
  const profiles = {}
  await Promise.all(openIds.map(async (openId) => {
    const result = await db.collection('users').doc(getUserId(openId)).get().catch(() => null)
    const user = result && result.data
    if (user && user.profileCompleted) {
      profiles[openId] = {
        displayName: String(user.displayName || ''),
        avatarFileId: String(user.avatarFileId || '')
      }
    }
  }))
  return profiles
}

const publicComment = (comment, profiles) => ({
  id: comment._id,
  content: comment.content,
  createdAt: comment.createdAt,
  author: comment.authorName
    ? { displayName: String(comment.authorName), avatarFileId: '' }
    : (profiles[comment.authorOpenId] || { displayName: '访客', avatarFileId: '' })
})

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const token = String(event.token || '').trim()
  const itemId = String(event.itemId || '').trim()

  if (!OPENID) throw new Error('UNAUTHENTICATED')

  if (token) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('INVALID_SHARE_TOKEN')

    const shareResult = await db.collection('share_links')
      .where({ token })
      .limit(1)
      .get()
    const share = shareResult.data && shareResult.data[0]
    if (!share || !share.enabled || share.revokedAt) throw new Error('SHARE_UNAVAILABLE')

    const entryResult = await db.collection('shared_entries').doc(share.sharedEntryId).get()
    const entry = entryResult.data
    if (!entry) throw new Error('SHARED_ENTRY_NOT_FOUND')

    const comments = await db.collection('private_comments')
      .where({ shareId: share._id })
      .limit(100)
      .get()
    const visibleComments = entry.ownerOpenId === OPENID
      ? comments.data
      : comments.data.filter((comment) => comment.authorOpenId === OPENID)
    visibleComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

    const profiles = await loadProfiles(visibleComments)
    return {
      ownerView: entry.ownerOpenId === OPENID,
      comments: visibleComments.map((comment) => publicComment(comment, profiles))
    }
  }

  if (!itemId) throw new Error('INVALID_ENTRY_ID')

  const comments = await db.collection('private_comments')
    .where({ originalEntryId: itemId })
    .limit(100)
    .get()
  const ownedComments = comments.data.filter((comment) => comment.ownerOpenId === OPENID)
  ownedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const profiles = await loadProfiles(ownedComments)
  return {
    ownerView: true,
    comments: ownedComments.map((comment) => publicComment(comment, profiles))
  }
}
