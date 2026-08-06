const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHENTICATED')

  const displayName = String(event.displayName || '').trim()
  const avatarFileId = String(event.avatarFileId || '').trim()
  if (!displayName || displayName.length > 20) throw new Error('INVALID_DISPLAY_NAME')
  if (!avatarFileId.startsWith('cloud://')) throw new Error('INVALID_AVATAR')

  const userId = `user_${crypto.createHash('sha256').update(OPENID).digest('hex')}`
  await db.collection('users').doc(userId).update({
    data: {
      openid: OPENID,
      displayName,
      avatarFileId,
      profileCompleted: true,
      updatedAt: db.serverDate()
    }
  })

  return {
    user: { displayName, avatarFileId, profileCompleted: true }
  }
}
