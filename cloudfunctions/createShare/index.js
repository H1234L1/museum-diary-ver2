const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

const cleanCloudFileId = (value) => {
  const fileId = String(value || '').trim()
  return fileId.startsWith('cloud://') ? fileId : ''
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHENTICATED')

  const entry = event.entry || {}
  const originalEntryId = cleanText(entry.id, 160)
  const entryType = ['photo', 'text', 'audio'].includes(entry.type)
    ? entry.type
    : 'text'

  if (!originalEntryId) throw new Error('INVALID_ENTRY_ID')

  const snapshot = {
    originalEntryId,
    type: entryType,
    title: cleanText(entry.title, 200),
    date: cleanText(entry.date, 40),
    story: cleanText(entry.story, 20000),
    hall: cleanText(entry.hall, 120),
    exhibitNumber: cleanText(entry.exhibitNumber, 8) || '----',
    imageFileId: cleanCloudFileId(entry.imageFileId),
    audioFileId: cleanCloudFileId(entry.audioFileId)
  }

  if (entryType === 'photo' && !snapshot.imageFileId) {
    throw new Error('PHOTO_UPLOAD_REQUIRED')
  }
  if (entryType === 'audio' && !snapshot.audioFileId) {
    throw new Error('AUDIO_UPLOAD_REQUIRED')
  }

  const now = db.serverDate()
  const entryResult = await db.collection('shared_entries').add({
    data: {
      ownerOpenId: OPENID,
      ...snapshot,
      createdAt: now,
      updatedAt: now
    }
  })

  const token = crypto.randomBytes(32).toString('hex')

  try {
    const shareResult = await db.collection('share_links').add({
      data: {
        token,
        sharedEntryId: entryResult._id,
        ownerOpenId: OPENID,
        enabled: true,
        createdAt: db.serverDate(),
        expiresAt: null,
        revokedAt: null
      }
    })

    return {
      token,
      shareId: shareResult._id,
      sharedEntryId: entryResult._id
    }
  } catch (error) {
    await db.collection('shared_entries').doc(entryResult._id).remove().catch(() => {})
    throw error
  }
}
