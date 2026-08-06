const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const getShareByToken = async (token) => {
  const result = await db.collection('share_links')
    .where({ token })
    .limit(1)
    .get()
  return result.data && result.data[0]
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const token = String(event.token || '').trim()
  const content = String(event.content || '').trim()
  const authorName = String(event.authorName || '').trim()

  if (!OPENID) throw new Error('UNAUTHENTICATED')
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('INVALID_SHARE_TOKEN')
  if (!content || content.length > 500) throw new Error('INVALID_COMMENT')
  if (!authorName || authorName.length > 20) throw new Error('INVALID_AUTHOR_NAME')

  const share = await getShareByToken(token)
  if (!share || !share.enabled || share.revokedAt) throw new Error('SHARE_UNAVAILABLE')

  if (share.expiresAt) {
    const expiresAt = new Date(share.expiresAt).getTime()
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new Error('SHARE_EXPIRED')
    }
  }

  const entryResult = await db.collection('shared_entries').doc(share.sharedEntryId).get()
  const entry = entryResult.data
  if (!entry) throw new Error('SHARED_ENTRY_NOT_FOUND')
  if (entry.ownerOpenId === OPENID) throw new Error('OWNER_COMMENT_NOT_ALLOWED')

  const result = await db.collection('private_comments').add({
    data: {
      shareId: share._id,
      sharedEntryId: share.sharedEntryId,
      originalEntryId: entry.originalEntryId,
      ownerOpenId: entry.ownerOpenId,
      authorOpenId: OPENID,
      authorName,
      content,
      createdAt: db.serverDate()
    }
  })

  return {
    comment: {
      id: result._id,
      authorName,
      content,
      createdAt: Date.now()
    }
  }
}
