const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const token = String(event.token || '').trim()
  if (!OPENID) throw new Error('UNAUTHENTICATED')
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('INVALID_SHARE_TOKEN')

  const shareResult = await db.collection('share_links')
    .where({ token })
    .limit(1)
    .get()
  const share = shareResult.data && shareResult.data[0]
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

  return {
    shareId: share._id,
    isOwner: entry.ownerOpenId === OPENID,
    entry: {
      id: entry.originalEntryId,
      type: entry.type,
      title: entry.title,
      date: entry.date,
      story: entry.story,
      hall: entry.hall,
      image: entry.imageFileId,
      audio: entry.audioFileId,
      exhibitNumber: entry.exhibitNumber || '----'
    }
  }
}
