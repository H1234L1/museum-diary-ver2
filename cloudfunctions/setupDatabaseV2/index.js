const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async () => {
  const names = [
    'shared_entries',
    'share_links',
    'private_comments',
    'users'
  ]

  const results = []

  for (const name of names) {
    try {
      await db.createCollection(name)
      results.push({
        name,
        created: true
      })
    } catch (error) {
      results.push({
        name,
        created: false,
        message: error.message || String(error)
      })
    }
  }

  return { results }
}
