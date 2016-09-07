const uid = require('uid-safe')
const Store = require('./store')
const MemoryStore = require('./memory_store')

module.exports = ({ key = 'koa:sess', store = new MemoryStore(), ttl = 3600 * 24 } = {}) => {
  store = new Store(store)

  return async (ctx, next) => {
    const cookieSid = ctx.cookies.get(key)

    let sid = cookieSid
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await store.get(`${key}:${sid}`)
      // session should be a no-null object
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {}
      }
    }

    // session data
    const storeData = JSON.stringify(ctx.session)

    // expose session handler to ctx
    ctx.sessionHandler = {
      getId: () => sid,
      clear: () => {
        ctx.session = {}
      },
      regenerate: () => {
        sid = uid.sync(24)
        ctx.session = {}
      },
      ttl: ms => {
        ttl = ms
      }
    }

    await next()

    // session id has been changed
    if (sid !== cookieSid) {
      if (cookieSid) {
        store.destroy(`${key}:${cookieSid}`)
      }
      // update cookie
      ctx.cookies.set(key, sid)
    }

    // data is not changed
    if (storeData === JSON.stringify(ctx.session)) return

    // update new session to store
    if (ctx.session && Object.keys(ctx.session).length) {
      store.set(`${key}:${sid}`, ctx.session, ttl)
    } else {
      store.destroy(`${key}:${sid}`)
    }
  }
}
