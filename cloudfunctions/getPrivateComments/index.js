const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const publicComment = (comment) => ({
  id: comment._id,
  content: comment.content,
  createdAt: comment.createdAt
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

    return {
      ownerView: entry.ownerOpenId === OPENID,
      comments: visibleComments.map(publicComment)
    }
  }

  if (!itemId) throw new Error('INVALID_ENTRY_ID')

  const comments = await db.collection('private_comments')
    .where({ originalEntryId: itemId })
    .limit(100)
    .get()
  const ownedComments = comments.data.filter((comment) => comment.ownerOpenId === OPENID)
  ownedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return {
    ownerView: true,
    comments: ownedComments.map(publicComment)
  }
}
