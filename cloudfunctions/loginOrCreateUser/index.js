const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const createUserId = (openId) => (
  `user_${crypto.createHash('sha256').update(openId).digest('hex')}`
)

const toSafeProfile = (user = {}) => ({
  displayName: String(user.displayName || ''),
  avatarFileId: String(user.avatarFileId || ''),
  profileCompleted: Boolean(user.profileCompleted)
})

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('UNAUTHENTICATED')

  const userId = createUserId(OPENID)
  const userRef = db.collection('users').doc(userId)

  try {
    const result = await userRef.get()
    return {
      created: false,
      user: toSafeProfile(result.data)
    }
  } catch (error) {
    const isMissingUser = error && (
      error.errCode === -1
      || error.code === 'DATABASE_DOCUMENT_NOT_EXIST'
      || /not exist|not found/i.test(error.message || '')
    )
    if (!isMissingUser) throw error
  }

  if (event.create === false) {
    return { created: false, user: null }
  }

  const user = {
    openid: OPENID,
    displayName: '',
    avatarFileId: '',
    profileCompleted: false,
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }

  await userRef.set({ data: user })

  return {
    created: true,
    user: toSafeProfile(user)
  }
}
