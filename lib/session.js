const uid = require('uid-safe')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const oneDay = 24 * 3600 * 1000

module.exports = ({ key = 'koa:sess', store = new MemoryStore(), cookie = null } = {}) => {
  const sessionStore = new Store(store)

  return async(ctx, next) => {
    const cookieSid = ctx.cookies.get(key)

    let sid = cookieSid
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await sessionStore.get(`${key}:${sid}`)
        // session should be a no-null object
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {}
      }
    }

    // session data
    const storeData = JSON.stringify(ctx.session)
    let ttl = oneDay

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
      },
    }

    await next()

    // check session data ttl
    if (ttl <= 0) {
      // session with expired cookie, delete session data
      if (cookieSid) sessionStore.destroy(`${key}:${sid}`)
      return
    }

    // setup cookie options
    const ckOption = {
      maxAge: 0, // use session cookie by default
      path: '/',
      secure: false,
      httpOnly: true,
    }
    if (cookie && typeof cookie === 'object') {
      Object.assign(ckOption, cookie)
    }

    // check session cookie
    if (sid !== cookieSid && ckOption.maxAge >= 0 && ttl > 0) {
      // get new session id
      if (cookieSid) {
        sessionStore.destroy(`${key}:${cookieSid}`)
      }
      // disable signed option and set cookie
      Object.assign(ckOption, {
        overwrite: true,
        signed: false,
      })
      ctx.cookies.set(key, sid, ckOption)
    }

    // data doesn't need to live longer than cookie
    if (ckOption.maxAge > 0 && ttl > ckOption.maxAge) {
      ttl = ckOption.maxAge
    }

    // data is not changed
    if (storeData === JSON.stringify(ctx.session)) return

    // update new session to sessionStore
    if (ctx.session && Object.keys(ctx.session).length) {
      sessionStore.set(`${key}:${sid}`, ctx.session, ttl)
    } else if (cookieSid && sid === cookieSid) {
      sessionStore.destroy(`${key}:${sid}`)
    }
  }
}
